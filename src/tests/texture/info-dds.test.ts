import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("info-dds", () => {
  const box = new Sandbox(__filename);

  let compressed: CliResult;
  let ui: CliResult;

  beforeAll(() => {
    compressed = box.run("info-dds", ["--path", gamedata("textures/prop_lampa_g.dds")]);
    ui = box.run("info-dds", ["--path", gamedata("textures/ui_empty.dds")]);
  });

  // DXT1 with a mip chain.
  it("should report a compressed texture", () => {
    expect(compressed).toMatchSnapshot();
  });

  it("should report a ui texture", () => {
    expect(ui).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
