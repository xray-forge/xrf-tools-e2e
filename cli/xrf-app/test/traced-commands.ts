import { browser } from "@wdio/globals";

import { type Trace } from "#/xrf-app/test/trace";

/**
 * Element commands a spec acts through.
 *
 * @remarks
 * Everything else a spec calls on an element is a question about the screen rather than a change to it, and a picture
 * of one would be the previous picture again.
 */
const ELEMENT_ACTIONS = ["click", "doubleClick", "moveTo", "setValue", "clearValue"] as const;

/**
 * Browser commands a spec acts through.
 *
 * @remarks
 * Not `execute`. Evaluating a script changes nothing on screen unless the script does, and the service injects its own
 * console forwarding often enough that photographing every evaluation buries the actions in copies of the last frame.
 */
const BROWSER_ACTIONS = ["url"] as const;

/**
 * How long to wait before each command, in milliseconds, so a run can be watched live.
 *
 * @remarks
 * Off unless `XRF_E2E_SLOW_MO` is set. Read once, so a run cannot change pace halfway through.
 */
const SLOW_MOTION_MS: number = Number.parseInt(process.env.XRF_E2E_SLOW_MO ?? "", 10) || 0;

/**
 * Makes every command that changes the screen leave a picture behind.
 *
 * @remarks
 * The commands are wrapped rather than watched through the `afterCommand` hook, which reports neither a click nor a
 * script evaluation by name in this runner: nearly half of what it announces arrives with no name at all. Wrapping the
 * handful a spec acts through says exactly what is traced, and says it here rather than in every spec.
 *
 * @param trace - Where the pictures go.
 */
export async function installTracedCommands(trace: Trace): Promise<void> {
  for (const command of ELEMENT_ACTIONS) {
    await browser.overwriteCommand(command, toTracedCommand(trace, command), true);
  }

  for (const command of BROWSER_ACTIONS) {
    await browser.overwriteCommand(command, toTracedCommand(trace, command), false);
  }
}

/**
 * Waits, when a run has been asked to go slowly enough to watch.
 *
 * @remarks
 * A plain timer rather than `browser.pause`, which is itself a command and would call this again on its way through.
 */
export async function pauseForSlowMotion(): Promise<void> {
  if (SLOW_MOTION_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, SLOW_MOTION_MS));
  }
}

/**
 * One command, followed by a picture of what it did.
 *
 * @param trace - Where the picture goes.
 * @param command - Command being wrapped, which names the picture.
 * @returns The replacement command.
 */
function toTracedCommand(trace: Trace, command: string) {
  // Loosely typed on purpose: one wrapper serves commands whose signatures have nothing in common, and the overwrite
  // API describes each of them by its own name rather than by a shape a wrapper could satisfy.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return async function traced(this: any, original: (...args: Array<any>) => any, ...args: Array<any>): Promise<any> {
    const result: unknown = await original.apply(this, args);

    await trace.captureStep(command);

    return result;
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
