import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

/**
 * What `ogf info` reports to a machine.
 *
 * @remarks
 * Compared as the document itself rather than as a hash, so every field, name and nesting level of
 * the payload reaches the diff: a change to the reported shape is readable here rather than merely
 * detected. The envelope around it is pinned once in `cli/reporting`.
 */
describe("ogf info report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("ogf info", [
      "--path",
      gamedata("meshes/ogf/part_none.ogf"),
      "--silent",
      "--report",
      box.at("minimal.json"),
    ]);
    box.run("ogf info", ["--path", gamedata("meshes/ogf/wpn_pm_lod.ogf"), "--silent", "--report", box.at("lod.json")]);
  });

  it("should report a visual's bones, bounds and material", () => {
    expect(box.json("minimal.json")).toMatchSnapshot();
  });

  it("should report a lod visual, which carries no motion refs", () => {
    expect(box.json("lod.json")).toMatchSnapshot();
  });
});
