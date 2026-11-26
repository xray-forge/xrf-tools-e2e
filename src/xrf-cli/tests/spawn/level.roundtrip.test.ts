import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { ENGINE_MATERIALS, writeGameMaterials } from "#/xrf-cli/test/game-materials";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Every spawn command over a level's spawn list rather than a root spawn. The suite commits no spawn list, so one is
 * made the way a level gets its own: `level build` of the `levels/chain` scene, whose actor it writes into
 * `level.spawn`. That list is then read, checked, unpacked and packed back, repacked in one step, and re-unpacked.
 */
describe("spawn level roundtrip", () => {
  const box = new Sandbox(__filename);
  const list: string = box.at("gamedata/levels/chain/level.spawn");

  let info: CliResult;
  let verify: CliResult;
  let unpack: CliResult;
  let pack: CliResult;
  let repack: CliResult;
  let reunpack: CliResult;

  beforeAll(() => {
    box.copyIn(resource("levels/chain/rawdata"), "rawdata");
    box.copyIn(resource("levels/chain/gamedata"), "gamedata");
    writeGameMaterials(box.at("gamedata/gamemtl.xr"), ENGINE_MATERIALS);
    box.run("level build", [
      box.at("rawdata/levels/chain.level"),
      "--dest",
      box.at("gamedata/levels/chain"),
      "--game-materials",
      box.at("gamedata/gamemtl.xr"),
      "--report",
      box.at("build.json"),
    ]);

    info = box.run("spawn info", [list, "--report", box.at("info.json")]);
    verify = box.run("spawn verify", [list, "--report", box.at("verify.json")]);
    unpack = box.run("spawn unpack", [list, "--dest", box.at("unpacked"), "--report", box.at("unpack.json")]);
    pack = box.run("spawn pack", [
      box.at("unpacked"),
      "--dest",
      box.at("packed.spawn"),
      "--report",
      box.at("pack.json"),
    ]);
    repack = box.run("spawn repack", [list, "--dest", box.at("repacked.spawn"), "--report", box.at("repack.json")]);
    reunpack = box.run("spawn re-unpack", [
      box.at("unpacked"),
      "--dest",
      box.at("reunpacked"),
      "--report",
      box.at("reunpack.json"),
    ]);
  });

  it("should build the level's spawn list", () => {
    expect(envelopeAt(box.at("build.json"))).toMatchObject({ exitCode: 0 });
  });

  it("should read it as a level's list of the actor and its two graph points", () => {
    expect(envelopeAt(box.at("info.json"))).toMatchObject({
      exitCode: 0,
      result: {
        kind: "level",
        sections: [
          { name: "actor", objects: 1 },
          { name: "graph_point", objects: 2 },
        ],
      },
    });
    expect(info).toMatchSnapshot();
  });

  it("should verify it", () => {
    expect(envelopeAt(box.at("verify.json"))).toMatchObject({ exitCode: 0 });
    expect(verify).toMatchSnapshot();
  });

  it("should unpack every object typed, none verbatim", () => {
    expect(envelopeAt(box.at("unpack.json"))).toMatchObject({
      exitCode: 0,
      result: { typedObjects: 3, verbatimObjects: [] },
    });
    expect(unpack).toMatchSnapshot();
    expect(box.json("unpack.json")).toMatchSnapshot();
  });

  it("should pack the unpacked list back to the same bytes", () => {
    expect(pack).toMatchSnapshot();
    expect(box.sha("packed.spawn")).toBe(box.sha("gamedata/levels/chain/level.spawn"));
  });

  it("should repack it in one step to the same bytes", () => {
    expect(repack).toMatchSnapshot();
    expect(box.sha("repacked.spawn")).toBe(box.sha("gamedata/levels/chain/level.spawn"));
  });

  it("should re-unpack the unpacked list to the same files", () => {
    expect(reunpack).toMatchSnapshot();

    const unpacked = box.manifest().filter((file) => file.path.startsWith("unpacked/"));
    const reunpacked = box.manifest().filter((file) => file.path.startsWith("reunpacked/"));

    expect(reunpacked.map((file) => [file.path.replace(/^reunpacked\//, ""), file.sha256])).toEqual(
      unpacked.map((file) => [file.path.replace(/^unpacked\//, ""), file.sha256])
    );
    expect(unpacked.length).toBeGreaterThan(0);
  });

  it("should write the expected files", () => {
    expect(
      box.manifest({
        normalized: [
          "build.json",
          "info.json",
          "verify.json",
          "unpack.json",
          "pack.json",
          "repack.json",
          "reunpack.json",
        ],
      })
    ).toMatchSnapshot();
  });
});
