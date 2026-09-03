import { CLI_EXECUTABLE_NAME, CLI_EXECUTABLE_STEM, RESOURCES_ROOT } from "./constants";

// eslint-disable-next-line no-control-regex -- matching the escape character is the point.
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

/**
 * Durations printed with their unit, such as `130ms` or `0 sec`.
 */
const DURATION_PATTERN = /\b\d+(\.\d+)?\s?(ms|milliseconds|seconds|secs|sec|minutes|mins|min|hours|s|m|h)\b/gi;

/**
 * The resolved width a command states before it starts, on the commands that let a caller change it.
 *
 * @remarks
 * The number is whatever the host offered, so it differs between two correct runs on two machines. The origin beside
 * it is left standing: `auto` or `requested` follows from the command line rather than from the host, and it is the
 * part that says whether a `-j` reached the run at all.
 */
const WORKERS_PATTERN = /\b(Workers: )\d+\b/g;

const TIMESTAMP_PATTERN = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?Z?\b/g;

/**
 * OS wording and numeric codes for a missing filesystem entry differ by platform.
 */
const MISSING_PATH_PATTERN =
  /(?:The system cannot find the (?:path|file) specified\.|No such file or directory) \(os error \d+\)/gi;

/**
 * The executable as the host names it, which clap echoes into every usage line.
 *
 * @remarks
 * `xrf-cli.exe` on Windows and `xrf-cli` elsewhere, so help output would otherwise be recordable on
 * one platform only. Anchored to the known stem rather than stripping any `.exe`, so a genuine
 * reference to some other executable in captured output still reaches the diff.
 */
const EXECUTABLE_PATTERN = new RegExp(`\\b${CLI_EXECUTABLE_NAME.split(".").join("\\.")}\\b`, "g");

/**
 * A timing field in a json report, carried as a bare number with the unit in the field name.
 *
 * @remarks
 * Either a Rust `Duration` pair (`secs` / `nanos`) or an explicit field such as `durationMs`. No
 * unit appears in the text, so the unit-suffixed rule cannot see them. Matching the field name
 * rather than the value is what keeps this from rewriting real measurements such as counts.
 */
const JSON_DURATION_PATTERN = /"([a-zA-Z_]*(?:duration|elapsed|nanos|secs)[a-zA-Z_]*)":\s*[\d.]+/gi;

/**
 * The throughput field of an archive pack report, bytes per second as a bare number.
 *
 * @remarks
 * Derived from a duration, so it differs on every run for the same reason a duration does. Anchored
 * on the member the pack result writes just before it — `sizeWritten` while the envelope sorts its
 * keys, `duration` (already tokenized by the rule above) should it ever keep declaration order —
 * because `speed` is not this field's name alone: an OMF motion has a `speed` too, and that one is a
 * real measurement that must stay asserted.
 */
const JSON_SPEED_PATTERN = /("(?:sizeWritten|duration)":\s*(?:\d+|"<duration>"),\s*)"speed":\s*\d+/g;

/**
 * A throughput in human output, a scaled byte count over one second.
 *
 * @remarks
 * `Speed: 42.3 MB/s` in an archive pack summary. The unit is asserted by the token's shape; the value
 * is what moves between two correct runs.
 */
const SPEED_PATTERN = /\b\d+(?:\.\d+)? (?:B|KB|MB|GB|TB)\/s\b/g;

/**
 * The `build` block of a report envelope, in both the pretty and the compact encoding.
 *
 * @remarks
 * `BuildInfo` is flat, so refusing nested braces is enough to bound the block — and is deliberate: if it
 * ever gains a nested member this stops matching and the snapshots fail loudly, rather than scrubbing
 * half a block and looking correct. Volatile members are rewritten only inside what this matches,
 * because `version` is also a format field elsewhere — OGF 4, spawn 10 — that must stay asserted.
 */
const JSON_BUILD_BLOCK_PATTERN = /"build":\s*{[^{}]*}/g;

/**
 * Every member of a `build` block, whose values all differ between two builds of the same source.
 *
 * @remarks
 * Values are tokenized and the field names left standing, which is how `version.test.ts` already
 * records this surface: a recording moves when the reported set of fields changes, not when someone
 * rebuilds. `kind` is included for the same reason it is matched rather than recorded there — it says
 * whether the target executable is a local build or a workflow artifact, so keeping it would make
 * one golden describe one source.
 */
const JSON_BUILD_MEMBER_PATTERN =
  /"(version|kind|commit|reference|isDirty|builtAt|target|rustc|profile|optimization|runId)":\s*(?:"(?:[^"\\]|\\.)*"|true|false|null)/g;

/**
 * The `execution` block of a report envelope, carried by every run whether or not it declared `--jobs`.
 *
 * @remarks
 * Bounded by refusing nested braces for the same reason the build block is: a member that grows a shape of its own
 * stops this matching and fails the recordings loudly, rather than scrubbing half a block and looking correct.
 */
const JSON_EXECUTION_BLOCK_PATTERN = /"execution":\s*{[^{}]*}/g;

/**
 * The one member of an `execution` block that describes the host rather than the run.
 *
 * @remarks
 * `workers` is whatever this machine offered, so a recording carrying it would describe one machine. `origin` stays
 * asserted: it is decided by the command line, and losing it would stop the recordings noticing that a requested
 * width silently became an automatic one.
 */
const JSON_WORKERS_MEMBER_PATTERN = /"(workers)":\s*\d+/g;

const TOKENIZED_PATH_PATTERN = /<(?:resources|sandbox)>[^\s'"]*/g;

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceRoot(value: string, root: string, token: string): string {
  const backslashed: string = root.split("/").join("\\");
  const variants: Set<string> = new Set([
    root,
    root.split("\\").join("/"),
    backslashed,
    // As a JSON string carries it: the tool's own reports quote paths, and an escaped separator is a
    // different byte sequence than the one the host handed us. Without this the absolute path
    // survives into a report's hash, which is how a snapshot ends up describing one checkout.
    backslashed.split("\\").join("\\\\"),
  ]);

  let result: string = value;

  for (const variant of variants) {
    result = result.replace(new RegExp(escapeForRegExp(variant), "gi"), token);
  }

  return result;
}

/**
 * Makes captured text comparable across machines, platforms and runs.
 *
 * @remarks
 * Absolute paths, timings, the resolved worker count, and colour codes differ between two correct
 * runs of the same binary; separator style, the executable's file name and the wording of an OS
 * error differ between two correct platforms. Those differences are normalized away, so one recording
 * is the golden everywhere. Anything else that differs is a real change and must reach the diff.
 *
 * @param text - Raw output or file content.
 * @param sandboxRoot - Sandbox whose path becomes the `<sandbox>` token.
 * @returns Normalized lines with trailing blank lines removed.
 */
export function normalizeText(text: string, sandboxRoot: string): Array<string> {
  let normalized: string = text.replace(ANSI_PATTERN, "");

  normalized = replaceRoot(normalized, sandboxRoot, "<sandbox>");
  normalized = replaceRoot(normalized, RESOURCES_ROOT, "<resources>");

  // Separators inside a token become `/`, and repeats collapse: a path that reached us JSON-escaped
  // leaves a doubled separator behind, which would otherwise read differently on each platform.
  normalized = normalized.replace(TOKENIZED_PATH_PATTERN, (match) =>
    match
      .split("\\")
      .join("/")
      .replace(/\/{2,}/g, "/")
  );
  normalized = normalized.replace(EXECUTABLE_PATTERN, CLI_EXECUTABLE_STEM);
  normalized = normalized.replace(TIMESTAMP_PATTERN, "<timestamp>");
  normalized = normalized.replace(MISSING_PATH_PATTERN, "<missing path>");
  normalized = normalized.replace(WORKERS_PATTERN, "$1<workers>");
  normalized = normalized.replace(JSON_DURATION_PATTERN, '"$1": "<duration>"');
  normalized = normalized.replace(JSON_SPEED_PATTERN, '$1"speed": "<speed>"');
  normalized = normalized.replace(SPEED_PATTERN, "<speed>");
  normalized = normalized.replace(JSON_BUILD_BLOCK_PATTERN, (block) =>
    block.replace(JSON_BUILD_MEMBER_PATTERN, '"$1": "<build>"')
  );
  normalized = normalized.replace(JSON_EXECUTION_BLOCK_PATTERN, (block) =>
    block.replace(JSON_WORKERS_MEMBER_PATTERN, '"$1": "<workers>"')
  );
  normalized = normalized.replace(DURATION_PATTERN, "<duration>");

  const lines: Array<string> = normalized.split(/\r?\n/).map((line) => line.trimEnd());

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines;
}
