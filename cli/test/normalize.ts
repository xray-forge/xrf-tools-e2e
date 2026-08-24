import { CLI_EXECUTABLE_NAME, CLI_EXECUTABLE_STEM, RESOURCES_ROOT } from "./constants";

// eslint-disable-next-line no-control-regex -- matching the escape character is the point.
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

/**
 * Durations printed with their unit, such as `130ms` or `0 sec`.
 */
const DURATION_PATTERN = /\b\d+(\.\d+)?\s?(ms|milliseconds|seconds|secs|sec|minutes|mins|min|hours|s|m|h)\b/gi;

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
 * Absolute paths, timings, and colour codes differ between two correct runs of the same binary;
 * separator style, the executable's file name and the wording of an OS error differ between two
 * correct platforms. Both classes are normalized away, so one recording is the golden everywhere.
 * Anything else that differs is a real change and must reach the diff.
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
  normalized = normalized.replace(JSON_DURATION_PATTERN, '"$1": <duration>');
  normalized = normalized.replace(DURATION_PATTERN, "<duration>");

  const lines: Array<string> = normalized.split(/\r?\n/).map((line) => line.trimEnd());

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines;
}
