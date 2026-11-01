import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The log the application under test keeps beside itself.
 *
 * @remarks
 * Every launch starts it afresh, moving the one before aside, and one spec file is one launch, so a spec reads only what
 * its own run logged.
 */
const APP_LOG: string = path.resolve(__dirname, "../../../target/xrf-app/appdata/logs/xrf-app.log");

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
    const lines: Array<string> = fs.existsSync(APP_LOG) ? fs.readFileSync(APP_LOG, "utf8").split(/\r?\n/) : [];

    if (lines.some((line: string) => EXIT_LINE.test(line))) {
      return lines;
    }

    if (Date.now() > deadline) {
      throw new Error(`The application logged no exit within ${timeoutMs} ms in '${APP_LOG}'.`);
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
