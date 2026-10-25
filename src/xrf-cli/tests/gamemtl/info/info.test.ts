import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { ENGINE_MATERIALS, writeGameMaterials } from "#/xrf-cli/test/game-materials";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("gamemtl info", () => {
  const box = new Sandbox(__filename);

  let vanilla: CliResult;
  let shadowOfChernobyl: CliResult;
  let otherVersion: CliResult;
  let missing: CliResult;

  beforeAll(() => {
    // Every game wrote version 1, so a library without density or multiplayer chunks reads as the first game's.
    writeGameMaterials(
      box.at("soc.xr"),
      ENGINE_MATERIALS.map((material) => ({ ...material, hasDensity: false, hasMultiplayerFactor: false })),
      [{ id: 0, materials: [0, 1] }]
    );
    // A version chunk saying 2, which the engine logs and refuses to load, and an empty numbering chunk.
    fs.writeFileSync(
      box.at("version.xr"),
      Buffer.from([0x00, 0x10, 0, 0, 2, 0, 0, 0, 2, 0, 0x01, 0x10, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    );

    vanilla = box.run("gamemtl info", ["--path", resource("gamemtl/gamemtl.xr")]);
    shadowOfChernobyl = box.run("gamemtl info", ["--path", box.at("soc.xr")]);
    otherVersion = box.run("gamemtl info", ["--path", box.at("version.xr")], { expectExit: 1 });
    missing = box.run("gamemtl info", ["--path", box.at("absent.xr")], { expectExit: 1 });
  });

  it("should report the game, materials and pairs of the vanilla library", () => {
    expect(vanilla).toMatchSnapshot();
  });

  it("should take a library without newer chunks for the first game", () => {
    expect(shadowOfChernobyl.stdout).toContain("Game: Shadow of Chernobyl");
    expect(shadowOfChernobyl).toMatchSnapshot();
  });

  it("should refuse a version the engine does not load", () => {
    expect(otherVersion).toMatchSnapshot();
  });

  it("should refuse a path holding nothing", () => {
    expect(missing).toMatchSnapshot();
  });

  it("should write only its fixtures", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
