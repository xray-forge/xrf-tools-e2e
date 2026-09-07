import { $, expect } from "@wdio/globals";
import { describe, it } from "mocha";

describe("settings", () => {
  it("opens the dialog and reads the build identity over IPC", async () => {
    await $('[data-testid="launcher-catalog"]').waitForExist({ timeout: 10_000 });
    await $('button[aria-label="Settings"]').click();

    const dialog = $('[role="dialog"]');

    await expect(dialog).toBeDisplayed();
    await expect(dialog.$("span=General")).toBeDisplayed();
    await expect(dialog.$("span=Storage")).toBeDisplayed();

    await dialog.$("span=Storage").click();

    await expect(dialog.$("h6=Local storage")).toBeDisplayed();

    await dialog.$("span=About").click();

    // Rendered only after `system|get_build_info` answers, so its presence proves the IPC bridge.
    const info = dialog.$('[data-testid="settings-build-info"]');

    await info.waitForExist();

    await expect(info).toHaveText(expect.stringContaining("Version"));
    await expect(info).toHaveText(expect.stringContaining("Target"));

    await dialog.$("button=Done").click();

    await expect(dialog).not.toBeExisting();
  });
});
