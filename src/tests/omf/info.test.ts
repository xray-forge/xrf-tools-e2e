import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("omf info", () => {
  const box = new Sandbox(__filename);

  let knife: CliResult;
  let svd: CliResult;
  let mp5: CliResult;

  beforeAll(() => {
    knife = box.run("omf info", ["--path", gamedata("meshes/omf/wpn_knife_hud_animation.omf")]);
    svd = box.run("omf info", ["--path", gamedata("meshes/omf/wpn_svd_hud_animation.omf")]);
    mp5 = box.run("omf info", ["--path", gamedata("meshes/omf/wpn_mp5_hud_animation.omf")]);
  });

  // The smallest container in the corpus: one motion, two bones, one part.
  it("should report a single motion container", () => {
    expect(knife).toMatchSnapshot();
  });

  it("should report a rifle animation set", () => {
    expect(svd).toMatchSnapshot();
  });

  it("should report a submachine gun animation set", () => {
    expect(mp5).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
