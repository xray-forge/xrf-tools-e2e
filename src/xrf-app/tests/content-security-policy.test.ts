import { $, $$, browser, expect } from "@wdio/globals";
import { before, describe, it } from "mocha";

import { type Nullable } from "#/types";
import { closeTool } from "#/xrf-app/test/window-menu";

/** One violation the page reported, as its `securitypolicyviolation` event names it. */
interface ICspViolation {
  directive: string;
  blocked: string;
}

/** A host no request reaches, so a probe refused by the policy is the only way it can fail fast. */
const OUTSIDE: string = "https://csp-probe.invalid";

/**
 * @returns Every violation the page reported since the listener was installed.
 */
async function readViolations(): Promise<Array<ICspViolation>> {
  return browser.execute(
    (): Array<ICspViolation> => (window as unknown as { __cspViolations: Array<ICspViolation> }).__cspViolations
  );
}

describe("content security policy", () => {
  before(async () => {
    await $('[data-testid="tool-launcher-catalog"]').waitForExist({ timeout: 10_000 });

    // Installed once the page is up: the tools open in this one document, so the listener sees each of them load.
    await browser.execute((): void => {
      const violations: Array<ICspViolation> = [];

      (window as unknown as { __cspViolations: Array<ICspViolation> }).__cspViolations = violations;
      document.addEventListener("securitypolicyviolation", (event: SecurityPolicyViolationEvent) =>
        violations.push({ directive: event.effectiveDirective, blocked: event.blockedURI })
      );
    });
  });

  it("opens every ready tool without a violation", async () => {
    // Every ready tool is a control named after itself; the list's own name is not a tool.
    const labels: Array<string> = (
      await $$('[data-testid="tool-launcher-catalog"] [aria-label]').map((it) => it.getAttribute("aria-label"))
    ).filter((label: Nullable<string>): label is string => label !== null && label !== "Tools");

    // A floor that a catalog that stopped naming its tools would fall through, not their count.
    await expect(labels.length).toBeGreaterThan(20);

    for (const label of labels) {
      await $(`[data-testid="tool-launcher-catalog"] [aria-label="${label}"]`).click();
      await expect($('[data-testid="editor-toolbar"]')).toHaveText(expect.stringContaining(label));
      await closeTool();
      await $('[data-testid="tool-launcher-catalog"]').waitForDisplayed({ timeout: 10_000 });
    }

    await expect(await readViolations()).toEqual([]);
  });

  it("refuses a page-made script and anything from outside the application", async () => {
    const isInlineRun: boolean = await browser.execute(async (outside: string): Promise<boolean> => {
      const script: HTMLScriptElement = document.createElement("script");
      const image: HTMLImageElement = new Image();

      script.textContent = "window.__cspInlineRan = true";
      document.head.append(script);
      await fetch(`${outside}/probe`).catch(() => null);
      image.src = `${outside}/probe.png`;
      document.body.append(image);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      script.remove();
      image.remove();

      return (window as unknown as { __cspInlineRan?: boolean }).__cspInlineRan === true;
    }, OUTSIDE);

    await expect(isInlineRun).toBe(false);
    await expect((await readViolations()).map((it) => it.directive).sort()).toEqual([
      "connect-src",
      "img-src",
      "script-src-elem",
    ]);
  });
});
