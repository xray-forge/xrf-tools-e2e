import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox } from "#/test/sandbox";

/**
 * What `dds info` reports to a machine.
 *
 * @remarks
 * Compared as the document itself rather than as a hash, so every field, name and nesting level of
 * the payload reaches the diff: a change to the reported shape is readable here rather than merely
 * detected. The envelope around it is pinned once in `cli/reporting`.
 */
describe("dds info report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("dds info", [
      "--path",
      gamedata("textures/prop_lampa_g.dds"),
      "--silent",
      "--report",
      box.at("compressed.json"),
    ]);
    box.run("dds info", ["--path", gamedata("textures/ui_empty.dds"), "--silent", "--report", box.at("ui.json")]);
  });

  it("should report a compressed texture's format and mip chain", () => {
    expect(box.json("compressed.json")).toMatchSnapshot();
  });

  it("should report an uncompressed ui texture", () => {
    expect(box.json("ui.json")).toMatchSnapshot();
  });
});
