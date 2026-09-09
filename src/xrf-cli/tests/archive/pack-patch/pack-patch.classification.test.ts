import { beforeAll, describe, expect, it } from "@jest/globals";

import { ADDED_WEAPON_LTX, EDITED_SYSTEM_LTX, createWorld, type WorldEdit } from "#/xrf-cli/test/patch-worlds";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/** One file rewritten, one added, one deleted: every class a comparison can report, in one run. */
const TARGET_EDITS: Array<WorldEdit> = [
  { content: EDITED_SYSTEM_LTX, path: "configs/system.ltx" },
  { content: ADDED_WEAPON_LTX, path: "configs/weapons/wpn_added.ltx" },
  { content: null, path: "configs/fonts.ltx" },
];

describe("archive pack-patch classification", () => {
  const box = new Sandbox(__filename);

  let compared: CliResult;

  beforeAll(() => {
    const base: string = createWorld(box, "base");
    const target: string = createWorld(box, "target", TARGET_EDITS);

    // Release shape, because it is the only one where every class is reportable: an overlay says nothing about what
    // it does not carry, so a deletion has nowhere to appear.
    compared = box.run("archive pack-patch", [
      "--input",
      base,
      "--target",
      target,
      "--dest",
      box.at("patch"),
      "--dry-run",
      "--release",
      "--report",
      box.at("compared.json"),
    ]);

    box.run("archive pack-patch", [
      "--input",
      base,
      "--target",
      target,
      "--dest",
      box.at("patch"),
      "--dry-run",
      "--report",
      box.at("overlay.json"),
    ]);
  });

  it("should report what changed and write nothing", () => {
    expect(compared).toMatchSnapshot();
  });

  it("should classify each entry in the report", () => {
    expect(box.json("compared.json")).toMatchSnapshot();
  });

  it("should carry the same entries as an overlay, without classifying the deletion", () => {
    // Same pair, same carried set. Only the reading of what the base holds alone differs.
    const released = box.json("compared.json") as { result: { added: Array<unknown>; modified: Array<unknown> } };
    const overlay = box.json("overlay.json") as {
      result: { added: Array<unknown>; modified: Array<unknown>; removed: Array<unknown>; shape: string };
    };

    expect(overlay.result.added).toEqual(released.result.added);
    expect(overlay.result.modified).toEqual(released.result.modified);
    expect(overlay.result.removed).toEqual([]);
    expect(overlay.result.shape).toBe("overlay");
  });

  it("should leave the destination absent on a dry run", () => {
    expect(box.manifest().filter((file) => file.path.startsWith("patch/"))).toEqual([]);
  });
});
