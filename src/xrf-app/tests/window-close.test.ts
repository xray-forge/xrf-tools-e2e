import { $, browser, expect } from "@wdio/globals";
import { describe, it } from "mocha";

import { readExitedAppLog, selectErrorLines } from "#/xrf-app/test/app-log";

/**
 * Whether the driven window is still there to answer.
 *
 * @remarks
 * The session ends with the application, after which every driver command fails.
 *
 * @returns Whether the driver still sees a window.
 */
async function isWindowOpen(): Promise<boolean> {
  try {
    return (await browser.getWindowHandles()).length > 0;
  } catch {
    return false;
  }
}

// Closing ends the application and the session with it, so this spec file holds this one test.
describe("window close", () => {
  it("closes on one click of the caption's close button, logging no error on the way out", async () => {
    await $('[data-testid="tool-launcher-catalog"]').waitForExist({ timeout: 10_000 });
    await $('button[aria-label="Close"]').click();

    // One click: the page approves and the window goes, without being asked a second time.
    await browser.waitUntil(async () => !(await isWindowOpen()), {
      timeout: 10_000,
      timeoutMsg: "The window stayed open after one click of its close button",
    });

    const lines: Array<string> = await readExitedAppLog();

    expect(lines).toContainEqual(expect.stringContaining("Window 'main' destroyed as its page approved"));
    expect(selectErrorLines(lines)).toEqual([]);
  });
});
