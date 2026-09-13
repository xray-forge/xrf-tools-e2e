import { $, expect } from "@wdio/globals";
import { describe, it } from "mocha";

describe("settings", () => {
  it("opens the dialog and reads the build identity over IPC", async () => {
    await $('[data-testid="application-launcher-catalog"]').waitForExist({ timeout: 10_000 });
    await $('button[aria-label="Settings"]').click();

    const dialog = $('[role="dialog"]');

    await expect(dialog).toBeDisplayed();
    await expect(dialog.$("span=General")).toBeDisplayed();
    await expect(dialog.$("span=Storage")).toBeDisplayed();

    await dialog.$("span=Storage").click();

    await expect(dialog.$("h6=Local storage")).toBeDisplayed();

    await dialog.$("span=About").click();

    const build = dialog.$('[data-testid="settings-build-section"]');

    await build.waitForExist();

    await expect(build).toHaveText(expect.stringContaining("Version"));
    await expect(build).toHaveText(expect.stringContaining("Target"));

    await dialog.$("button=Done").click();

    await expect(dialog).not.toBeExisting();
  });
});
