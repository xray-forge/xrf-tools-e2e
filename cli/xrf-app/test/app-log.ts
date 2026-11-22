import * as fs from "node:fs";
import * as path from "node:path";

import { type Nullable, type Optional } from "#/types";

/** Where the application under test keeps its logs, beside itself. */
const APP_LOGS: string = path.resolve(__dirname, "../../../target/xrf-app/appdata/logs");

/** A run's log, `xrf-app.<UTC start>.<process>.log`: its name sorts as the runs started. */
const RUN_LOG: RegExp = /^xrf-app\.\d.*\.log$/;

/**
 * The log of the last run the application started.
 *
 * @remarks
 * Every launch writes a log of its own, and one spec file is one launch, so a spec reads only what its own run logged.
 *
 * @returns The log's path, or null before any run.
 */
function findLastRunLog(): Nullable<string> {
  const runs: Array<string> = fs.existsSync(APP_LOGS)
    ? fs
        .readdirSync(APP_LOGS)
        .filter((name: string) => RUN_LOG.test(name))
        .sort()
    : [];
  const last: Optional<string> = runs.at(-1);

  return last === undefined ? null : path.join(APP_LOGS, last);
}

/** The line the application logs last on its way out. */
const EXIT_LINE: RegExp = /] Exiting application after /;

/** A line the application logged at error level, which its format puts right after the timestamp. */
const ERROR_LINE: RegExp = /^\[\S+ ERROR /;

/** How often to look for the exit line while the application is still on its way out. */
const POLL_MS: number = 100;

/**
 * Reads the log of an application that is exiting, once it has logged its last line.
 *
 * @remarks
 * The process goes after its window does, so a spec that closed the window waits here rather than reading a log the
 * application is still writing.
 *
 * @param timeoutMs - How long the application may take to exit.
 * @returns The log's lines.
 */
export async function readExitedAppLog(timeoutMs: number = 10_000): Promise<Array<string>> {
  const deadline: number = Date.now() + timeoutMs;

  for (;;) {
    const log: Nullable<string> = findLastRunLog();
    const lines: Array<string> = log === null ? [] : fs.readFileSync(log, "utf8").split(/\r?\n/);

    if (lines.some((line: string) => EXIT_LINE.test(line))) {
      return lines;
    }

    if (Date.now() > deadline) {
      throw new Error(`The application logged no exit within ${timeoutMs} ms in '${log ?? APP_LOGS}'.`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

/**
 * The lines an application logged at error level.
 *
 * @param lines - The log's lines.
 * @returns Those at error level, in order.
 */
export function selectErrorLines(lines: Array<string>): Array<string> {
  return lines.filter((line: string) => ERROR_LINE.test(line));
}
