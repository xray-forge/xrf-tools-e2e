import { $, $$, expect } from "@wdio/globals";

describe("launcher", () => {
  it("renders the tool catalog without a crash surface", async () => {
    await $('[data-testid="launcher-catalog"]').waitForExist({ timeout: 10_000 });

    await expect($("h1=Tools")).toBeDisplayed();
    await expect($('[data-testid="editor-toolbar"]')).toBeDisplayed();

    // Every ready tool is an accessible control named after itself; planned ones expose no name.
    await expect($$('[data-testid="launcher-catalog"] [aria-label="Archives explorer"]')).toBeElementsArrayOfSize(1);
    await expect($$('[data-testid="launcher-catalog"] [aria-label="Spawn editor"]')).toBeElementsArrayOfSize(1);

    await expect($("*=This tool stopped rendering")).not.toBeExisting();
    await expect($("*=This route does not exist")).not.toBeExisting();
  });

  it("opens a tool and returns to the launcher", async () => {
    await $('[data-testid="launcher-catalog"]').waitForExist({ timeout: 10_000 });
    await $('[data-testid="launcher-catalog"] [aria-label="Archives explorer"]').click();

    const toolbar = $('[data-testid="editor-toolbar"]');

    await expect(toolbar).toHaveText(expect.stringContaining("Archives explorer"));
    await expect($('[data-testid="launcher-catalog"]')).not.toBeExisting();
    await expect($("*=This tool stopped rendering")).not.toBeExisting();

    await toolbar.$("button=XRF").click();

    await expect($('[data-testid="launcher-catalog"]')).toBeDisplayed();
  });
});
