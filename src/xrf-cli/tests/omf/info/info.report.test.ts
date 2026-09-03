import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

/**
 * What `omf info` reports to a machine.
 */
describe("omf info report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("omf info", [
      "--path",
      gamedata("meshes/omf/wpn_knife_hud_animation.omf"),
      "--silent",
      "--report",
      box.at("knife.json"),
    ]);
  });

  it("should report every motion, part and bone count of a container", () => {
    expect(box.json("knife.json")).toMatchSnapshot();
  });
});
