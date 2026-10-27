import { $, $$, expect } from "@wdio/globals";
import { describe, it } from "mocha";

import { closeTool } from "#/xrf-app/test/window-menu";

describe("launcher", () => {
  it("renders the tool catalog without a crash surface", async () => {
    await $('[data-testid="tool-launcher-catalog"]').waitForExist({ timeout: 10_000 });

    await expect($("h1=Tools")).toBeDisplayed();
    await expect($('[data-testid="editor-toolbar"]')).toBeDisplayed();

    // Every ready tool is an accessible control named after itself; planned ones expose no name.
    await expect($$('[data-testid="tool-launcher-catalog"] [aria-label="Archives explorer"]')).toBeElementsArrayOfSize(
      1
    );
    await expect($$('[data-testid="tool-launcher-catalog"] [aria-label="Spawn editor"]')).toBeElementsArrayOfSize(1);

    await expect($("*=This tool stopped rendering")).not.toBeExisting();
    await expect($("*=This route does not exist")).not.toBeExisting();
  });

  it("opens a tool and returns to the launcher", async () => {
    await $('[data-testid="tool-launcher-catalog"]').waitForExist({ timeout: 10_000 });
    await $('[data-testid="tool-launcher-catalog"] [aria-label="Archives explorer"]').click();

    const toolbar = $('[data-testid="editor-toolbar"]');

    await expect(toolbar).toHaveText(expect.stringContaining("Archives explorer"));
    await expect($('[data-testid="tool-launcher-catalog"]')).not.toBeExisting();
    await expect($("*=This tool stopped rendering")).not.toBeExisting();

    await closeTool();

    await expect($('[data-testid="tool-launcher-catalog"]')).toBeDisplayed();
  });
});
