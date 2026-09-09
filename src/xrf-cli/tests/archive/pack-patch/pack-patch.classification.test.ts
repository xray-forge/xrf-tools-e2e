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

    compared = box.run("archive pack-patch", [
      "--input",
      base,
      "--target",
      target,
      "--dest",
      box.at("patch"),
      "--dry-run",
      "--report",
      box.at("compared.json"),
    ]);
  });

  it("should report what changed and write nothing", () => {
    expect(compared).toMatchSnapshot();
  });

  it("should classify each entry in the report", () => {
    expect(box.json("compared.json")).toMatchSnapshot();
  });

  it("should leave the destination absent on a dry run", () => {
    expect(box.manifest().filter((file) => file.path.startsWith("patch/"))).toEqual([]);
  });
});
