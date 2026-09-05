import * as path from "node:path";

import { $, $$, browser, expect } from "@wdio/globals";
import { before, describe, it } from "mocha";

import { APP_RESOURCES_ROOT } from "#/xrf-app/test/wdio.conf";

/** The committed fixture: a real descriptor declaring a bump pair, beside three 8x8 uncompressed files. */
const TEXTURE: string = path.resolve(APP_RESOURCES_ROOT, "gamedata/textures/act/act_arm_1.dds");

/** Where the open form reads a remembered path from, which is the only way a spec can fill a read-only field. */
const TEXTURE_FIELD_KEY: string = "xrf.form.textures-explorer.texture";

/**
 * Moves the pointer onto one texel of a channel tile.
 *
 * @param acrossFraction - How far across the tile, from 0 at the left.
 * @param downFraction - How far down the tile, from 0 at the top.
 */
async function hoverTexel(acrossFraction: number, downFraction: number): Promise<void> {
  const tile = $('[data-testid="texture-channel-bump"]');
  const size = await tile.getSize();

  // Onto the tile before onto the texel. The first move is what scrolls the panel and settles the layout under the
  // pointer, and a move that lands while that is still happening leaves the tile again before anything reads it.
  await tile.moveTo();

  // WebDriver measures an offset from the element's centre, not its corner, so a fraction across the tile is that
  // fraction less a half.
  await tile.moveTo({
    xOffset: Math.round(size.width * (acrossFraction - 0.5)),
    yOffset: Math.round(size.height * (downFraction - 0.5)),
  });
}

/**
 * @returns One string per row, label and value separated by a newline.
 */
async function readTexelRows(): Promise<Array<string>> {
  const rows = $$('[data-testid="texture-channels-panel"] [data-testid="visual-panel-row"]');

  return rows.map((it) => it.getText());
}

describe("textures explorer", () => {
  before(async () => {
    // The path field is read-only and only a native dialog writes it, so the remembered value is the way in.
    await browser.execute("window.localStorage.setItem(arguments[0], arguments[1])", TEXTURE_FIELD_KEY, TEXTURE);

    await $('[data-testid="launcher-catalog"]').waitForExist({ timeout: 10_000 });
    await $('[data-testid="launcher-catalog"] [aria-label="Textures explorer"]').click();

    await $("button=Texture").click();
    await $("button=Open").click();

    await $('[data-testid="texture-preview"]').waitForExist({ timeout: 20_000 });
  });

  it("reads the descriptor of one loose texture and the pair it declares", async () => {
    await expect($("#editor-toolbar")).toHaveText(expect.stringContaining("act_arm_1"));

    // The Material panel opens with the editor, so it is read rather than opened.
    const material = $('[data-testid="texture-material-panel"]');

    await expect(material).toHaveText(expect.stringContaining("act\\act_arm_1_bump"));
    await expect(material).toHaveText(expect.stringContaining("Bumped"));

    // Enabled only once both halves are uploaded, so this is the toolbar agreeing with the panel.
    await expect($('button[aria-label="Lit surface"]')).toBeEnabled();
  });

  it("reads a texel of the pair, as stored and as the engine reconstructs it", async () => {
    await $('[aria-label="Channels"]').click();
    await $('[data-testid="texture-channel-bump"]').waitForExist({ timeout: 10_000 });

    await hoverTexel(0.05, 0.05);

    // The first row the file stores, which is the row at the top: the fixture ramps green by 8 and height by 16 per
    // row, so reading the wrong end shows it immediately.
    //
    // Normal is `Nu.wzy + (NuE.xyz - 1)`, component by component:
    //   x = 200 / 255 + (255 / 255 - 1) = 0.784
    //   y = 90 / 255 + (200 / 255 - 1) = 0.137
    //   z = 40 / 255 + (64 / 255 - 1) = -0.592
    // Gloss is the bump's red squared, (128 / 255) ** 2 = 0.252, and height is the companion's blue, 64 / 255 = 0.251.
    await expect(await readTexelRows()).toEqual([
      "At\n0, 0 of 8 x 8",
      "Bump\n128, 40, 90, 200",
      "Bump#\n255, 200, 64, 0",
      "Normal\n0.784, 0.137, -0.592",
      "Gloss\n0.252",
      "Height\n0.251",
    ]);

    await hoverTexel(0.95, 0.95);

    // The last row: green is 40 + 8 * 7 = 96 and the companion's blue is 64 + 16 * 7 = 176, so height is
    // 176 / 255 = 0.690 and the normal's z becomes 40 / 255 + (176 / 255 - 1) = 0.067.
    await expect(await readTexelRows()).toEqual([
      "At\n7, 7 of 8 x 8",
      "Bump\n128, 96, 90, 200",
      "Bump#\n255, 200, 176, 0",
      "Normal\n0.784, 0.137, 0.067",
      "Gloss\n0.252",
      "Height\n0.690",
    ]);
  });
});
