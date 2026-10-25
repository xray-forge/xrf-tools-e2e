import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

/**
 * What `gamemtl info` reports to a machine.
 */
describe("gamemtl info report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("gamemtl info", ["--path", resource("gamemtl/gamemtl.xr"), "--silent", "--report", box.at("vanilla.json")]);
  });

  it("should report the counts and the game of the vanilla library", () => {
    expect(box.json("vanilla.json")).toMatchObject({
      exitCode: 0,
      result: {
        version: 1,
        game: "callOfPripyat",
        materials: 63,
        dynamicMaterials: 29,
        pairs: 1421,
        inheritingPairs: 984,
      },
    });
    expect(box.json("vanilla.json")).toMatchSnapshot();
  });
});
