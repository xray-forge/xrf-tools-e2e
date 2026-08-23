import * as cp from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { CLI_EXECUTABLE, TARGET_ROOT, TESTS_ROOT, TIMINGS_ROOT } from "./constants";
import { normalizeText } from "./normalize";

export interface CliResult {
  exitCode: number;
  stdout: Array<string>;
  stderr: Array<string>;
}

/**
 * How long one invocation took.
 *
 * @remarks
 * Never part of a snapshot: a duration differs on every run by nature, and comparing it would make
 * the suite fail for reasons that say nothing about the tool. It is recorded so the cost of each
 * command can be watched over time, which is a separate question from whether behavior changed.
 */
export interface CommandTiming {
  test: string;
  command: string;
  durationMs: number;
  exitCode: number;
}

export interface ManifestFile {
  path: string;
  size: number;
  sha256: string;
}

export interface RunOptions {
  /**
   * Exit code the command is expected to answer with.
   *
   * @remarks
   * A rejection is a valid expectation: a verifier fed a corrupt file should answer non-zero, and
   * declaring that here is what separates it from a command that simply broke.
   */
  expectExit?: number;
}

export interface ManifestOptions {
  /**
   * Sandbox-relative paths hashed over normalized text rather than raw bytes.
   *
   * @remarks
   * For artifacts the CLI itself authors, such as a json report that embeds how long the run took.
   * Never for a game asset, whose exact bytes are the thing under test.
   */
  normalized?: Array<string>;
}

/**
 * Sorts the findings a command logged while working in parallel.
 *
 * @remarks
 * `verify-gamedata`'s meshes check verifies through rayon and logs each finding to stderr as its
 * worker finishes, so two runs of one binary print the same findings in a different order. Only
 * that leading block is unordered: the summary printed after the blank line is stable, and so is
 * the json report of the same run, whose findings the tools repository sorts before writing them.
 *
 * todo: order the mesh findings in the tools repository before logging them too, then delete this
 * and snapshot the stream in the order the command prints it.
 *
 * @param result - Result whose leading stderr block is unordered.
 * @returns The same result with that block sorted.
 */
export function sortedFindings(result: CliResult): CliResult {
  const summaryAt: number = result.stderr.indexOf("");
  const end: number = summaryAt === -1 ? result.stderr.length : summaryAt;

  return { ...result, stderr: [...result.stderr.slice(0, end).sort(), ...result.stderr.slice(end)] };
}

/**
 * Hashes the exact bytes of a file.
 *
 * @param filePath - Absolute path to read.
 * @returns Lowercase hex sha256 digest.
 */
export function sha(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function collectFiles(root: string): Array<string> {
  const collected: Array<string> = [];

  function walk(directory: string): void {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute: string = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile()) {
        collected.push(path.relative(root, absolute).split(path.sep).join("/"));
      }
    }
  }

  walk(root);

  return collected.sort();
}

/**
 * A test's scratch directory and its handle on the binary under test.
 *
 * @remarks
 * Constructed once per test file as `new Sandbox(__filename)`, which names the directory after the
 * test and wipes whatever a previous run left there. It is also the working directory for every
 * command, so one invoked with a default relative destination writes inside it rather than into
 * the repository.
 */
export class Sandbox {
  public readonly name: string;
  public readonly root: string;

  private readonly timings: Array<CommandTiming> = [];

  /**
   * @param testFile - Pass `__filename` from the test; the directory is named after it.
   */
  public constructor(testFile: string) {
    this.name = path
      .relative(TESTS_ROOT, testFile)
      .replace(/\.test\.ts$/, "")
      .split(path.sep)
      .join("/");
    this.root = path.join(TARGET_ROOT, ...this.name.split("/"));

    fs.rmSync(this.root, { recursive: true, force: true });
    fs.mkdirSync(this.root, { recursive: true });
  }

  /**
   * Resolves a path inside this sandbox.
   *
   * @param relative - Sandbox-relative path.
   * @returns Absolute path.
   */
  public at(relative: string): string {
    return path.join(this.root, relative);
  }

  /**
   * Stages an input the command will rewrite in place.
   *
   * @remarks
   * Committed assets are read-only, so a command that edits its input operates on a copy.
   *
   * @param from - Absolute source path, file or directory.
   * @param to - Sandbox-relative destination.
   * @returns Absolute destination path.
   */
  public copyIn(from: string, to: string): string {
    const destination: string = this.at(to);

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(from, destination, { recursive: fs.statSync(from).isDirectory() });

    return destination;
  }

  /**
   * Writes an input the test itself authors.
   *
   * @remarks
   * For small inputs that belong to one test rather than to the corpus, such as a motion rename map
   * or a deliberately malformed file a command is expected to reject. Anything reused across tests
   * belongs in `src/resources/` instead.
   *
   * @param relative - Sandbox-relative destination.
   * @param content - File content.
   * @returns Absolute destination path.
   */
  public write(relative: string, content: string): string {
    const destination: string = this.at(relative);

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content, "utf8");

    return destination;
  }

  /**
   * Stages a deliberately truncated copy of a committed asset.
   *
   * @remarks
   * For the readers, whose contract includes refusing damaged input rather than reporting nonsense
   * from a half-parsed file. Cutting a real asset short is closer to what a failed download or a
   * bad export produces than a file of random bytes would be.
   *
   * @param from - Absolute source path.
   * @param to - Sandbox-relative destination.
   * @param bytes - How many leading bytes to keep.
   * @returns Absolute destination path.
   */
  public copyTruncated(from: string, to: string, bytes: number): string {
    const destination: string = this.at(to);

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, fs.readFileSync(from).subarray(0, bytes));

    return destination;
  }

  /**
   * Hashes a file inside this sandbox.
   *
   * @param relative - Sandbox-relative path.
   * @returns Lowercase hex sha256 digest.
   */
  public sha(relative: string): string {
    return sha(this.at(relative));
  }

  /**
   * Runs the binary under test with this sandbox as the working directory.
   *
   * @remarks
   * Throws when the exit code is not the expected one, so a broken command stops the test in
   * `beforeAll` rather than letting later assertions run against a sandbox that was never built.
   * The environment is pinned because `RUST_LOG` and colour variables would otherwise let a shell
   * setting change recorded output.
   *
   * @param command - Subcommand name, for example `info-ogf`.
   * @param args - Arguments, with absolute paths.
   * @param options - Expected exit code.
   * @returns Exit code and normalized streams.
   */
  public run(command: string, args: Array<string> = [], options: RunOptions = {}): CliResult {
    const environment: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: "1" };

    delete environment.RUST_LOG;
    delete environment.RUST_LOG_STYLE;
    delete environment.CLICOLOR_FORCE;

    const startedAt: bigint = process.hrtime.bigint();
    const spawned: cp.SpawnSyncReturns<string> = cp.spawnSync(CLI_EXECUTABLE, [command, ...args], {
      cwd: this.root,
      encoding: "utf8",
      env: environment,
      maxBuffer: 256 * 1024 * 1024,
      windowsHide: true,
    });
    const durationMs: number = Number(process.hrtime.bigint() - startedAt) / 1e6;

    if (spawned.error) {
      throw spawned.error;
    }

    this.recordTiming(command, durationMs, spawned.status ?? -1);

    const result: CliResult = {
      // A process killed by a signal reports a null code; -1 keeps the shape simple and still
      // fails against any real expectation.
      exitCode: spawned.status ?? -1,
      stdout: normalizeText(spawned.stdout ?? "", this.root),
      stderr: normalizeText(spawned.stderr ?? "", this.root),
    };

    const expected: number = options.expectExit ?? 0;

    if (result.exitCode !== expected) {
      const detail: string = [...result.stdout, ...result.stderr].slice(-8).join("\n");

      throw new Error(`'${command}' exited with ${result.exitCode}, expected ${expected}.\n${detail}`);
    }

    return result;
  }

  /**
   * Appends one measurement and rewrites this test's timing file.
   *
   * @remarks
   * Written after every invocation rather than at the end, so a test that fails part way still
   * leaves the timings of the commands that did run. Each test file owns its own file because Jest
   * runs them in separate worker processes, which would race on a shared one.
   *
   * @param command - Subcommand that ran.
   * @param durationMs - Wall-clock duration of the invocation.
   * @param exitCode - Code the command answered with.
   */
  private recordTiming(command: string, durationMs: number, exitCode: number): void {
    this.timings.push({
      test: this.name,
      command,
      durationMs: Math.round(durationMs),
      exitCode,
    });

    fs.mkdirSync(TIMINGS_ROOT, { recursive: true });
    fs.writeFileSync(
      path.join(TIMINGS_ROOT, `${this.name.split("/").join("__")}.json`),
      `${JSON.stringify(this.timings, undefined, 2)}\n`,
      "utf8"
    );
  }

  /**
   * Records everything the test left in the sandbox.
   *
   * @remarks
   * Catches the class of change that output alone misses: a command that starts writing an extra
   * file, or stops writing one, while saying exactly the same thing.
   *
   * @param options - Paths recorded by normalized content instead of raw bytes.
   * @returns One entry per file, in stable path order.
   */
  public manifest(options: ManifestOptions = {}): Array<ManifestFile> {
    const normalized: Array<string> = options.normalized ?? [];

    return collectFiles(this.root).map((relative) => {
      const absolute: string = this.at(relative);

      if (normalized.includes(relative)) {
        // Normalizing can change how many digits a timing had, so the file's own size is as
        // unstable as its bytes. The normalized length is what moves only on real change.
        const text: string = normalizeText(fs.readFileSync(absolute, "utf8"), this.root).join("\n");

        return {
          path: relative,
          size: Buffer.byteLength(text, "utf8"),
          sha256: crypto.createHash("sha256").update(text).digest("hex"),
        };
      }

      return { path: relative, size: fs.statSync(absolute).size, sha256: sha(absolute) };
    });
  }
}
