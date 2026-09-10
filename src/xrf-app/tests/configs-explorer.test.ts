import * as path from "node:path";

import { $, $$, browser, expect } from "@wdio/globals";
import { before, describe, it } from "mocha";

import { APP_RESOURCES_ROOT } from "#/xrf-app/test/wdio.conf";

/** The committed fixture: one entry point, the file it includes, a scheme declaration, and a broken parent. */
const CONFIGS: string = path.resolve(APP_RESOURCES_ROOT, "gamedata/configs");

/** Where the open form reads a remembered path from, which is the only way a spec can fill a read-only field. */
const ROOT_FIELD_KEY: string = "xrf.form.configs-explorer.root";

describe("configs explorer", () => {
  before(async () => {
    await $('[data-testid="launcher-catalog"]').waitForExist({ timeout: 10_000 });

    // The path field is read-only and only a native dialog writes it, so the remembered value is the way in.
    await browser.execute(
      (key: string, value: string): void => window.localStorage.setItem(key, value),
      ROOT_FIELD_KEY,
      CONFIGS
    );

    await $('[data-testid="launcher-catalog"] [aria-label="Configs explorer"]').click();
    await $("button=Open").click();

    await $('[data-testid="configs-menu"]').waitForExist({ timeout: 20_000 });
  });

  it("lists the project and says what each config is to it", async () => {
    const menu = $('[data-testid="configs-menu"]');

    await expect(menu).toHaveText(expect.stringContaining("system.ltx"));
    await expect(menu).toHaveText(expect.stringContaining("weapons.scheme.ltx"));

    // The badges are the answer this tree gives that a filesystem listing cannot: which config resolves on its own,
    // and which one declares the rules the others are judged by.
    await expect(menu).toHaveText(expect.stringContaining("entry"));
    await expect(menu).toHaveText(expect.stringContaining("scheme"));
  });

  it("reads a config and colours what only the parser knows", async () => {
    // Exact text on the label span: the row's own text is the name plus its badges, so a partial match on the row
    // would also match `weapons.scheme.ltx`.
    await $('[data-testid="configs-menu"]').$("span=system.ltx").click();

    const view = $('[data-testid="configs-document-view"]');

    await view.waitForExist({ timeout: 10_000 });

    // The text arrives from the backend decoded and split by the parser, so the numbering the gutter shows is the
    // numbering every finding and header is anchored to.
    await expect(view).toHaveText(expect.stringContaining("[system]"));
    await expect(view).toHaveText(expect.stringContaining("#include"));

    await expect($("*=This tool stopped rendering")).not.toBeExisting();
  });

  it("renders the document as addressable lines rather than one block of text", async () => {
    // That the listing is a listing, which is what lets a finding or a jump address one line. Whether it *windows*
    // them is pinned in `VirtualizedLines.test.tsx`, where the runner's windowing opt-out can be lifted; this fixture
    // is five lines long and could not tell the difference.
    const rows = await $$('[data-testid="configs-document-view"] [role="option"]');

    await expect(rows.length).toBeGreaterThan(0);
  });

  it("resolves an included config to what its entry point makes of it", async () => {
    // `w_base.ltx` is reached only through `system.ltx`, so its sections live in that resolution. What a person
    // opening it wants is what those sections came to, which is what the view narrows to.
    // Through the filter rather than the tree: a click on a directory row selects it, and only its chevron expands
    // it, so reaching a nested config by clicking is two different gestures. Search results open on one click.
    await $('[data-testid="configs-menu"]').$("input").setValue("w_base.ltx");

    // The result row carries its full label as a `title`, which is stable whatever element the list renders it in.
    const result = $('[aria-label="Config search results"]').$('[title="w_base.ltx"]');

    await result.waitForExist({ timeout: 10_000 });
    await result.click();
    await $('[data-testid="configs-authored-lines"]').waitForExist({ timeout: 20_000 });

    await $('button[aria-label="Resolved"]').click();

    const resolved = $('[data-testid="configs-resolved-lines"]');

    await resolved.waitForExist({ timeout: 20_000 });

    // Every field says where its value is written, which is the answer no other surface in the workspace gives.
    await expect(resolved).toHaveText(expect.stringContaining("[wpn_base]"));
    await expect(resolved).toHaveText(expect.stringContaining("written here"));

    // `wpn_child` inherits `$scheme` and restates the rest, so the resolved child names the section it came from.
    await $('[data-testid="configs-sections-panel"]').$("span=wpn_child").click();

    await expect(resolved).toHaveText(expect.stringContaining("inherited from [wpn_base]"));
  });

  it("returns to the launcher without leaving the project open", async () => {
    await $('[data-testid="editor-toolbar"]').$("button=XRF").click();

    await expect($('[data-testid="launcher-catalog"]')).toBeDisplayed();
  });
});
