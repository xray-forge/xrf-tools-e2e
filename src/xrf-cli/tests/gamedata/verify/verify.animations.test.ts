import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const HUD_MESH = "meshes/dynamics/devices/dev_bolt/dev_bolt_hud.ogf";
const HUD_MOTION_BANK = "meshes/dynamics/devices/dev_bolt/dev_bolt_hud_animation.omf";
const SYSTEM = [
  "[actor_hud]",
  "visual = dynamics\\devices\\dev_bolt\\dev_bolt_hud",
  "position = 0, 0, 0",
  "orientation = 0, 0, 0",
  "ancor_0 = anm",
  "ancor_1 = anm",
  "",
].join("\r\n");

describe("gamedata verify animations", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let damaged: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    for (const root of ["valid", "damaged"]) {
      box.write(`${root}/configs/system.ltx`, SYSTEM);
      // The source location is only a corpus grouping. The HUD's `visual` field resolves this engine path.
      box.copyIn(gamedata("meshes/ogf/dev_bolt_hud.ogf"), `${root}/${HUD_MESH}`);
    }

    // This check requires a readable bank with motion names; mesh/bone compatibility belongs to the meshes check.
    box.copyIn(gamedata("meshes/omf/wpn_knife_hud_animation.omf"), `valid/${HUD_MOTION_BANK}`);
    box.copyTruncated(gamedata("meshes/omf/wpn_knife_hud_animation.omf"), `damaged/${HUD_MOTION_BANK}`, 80);
    inputsBefore = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("damaged/"));

    valid = box.run("gamedata verify", [box.at("valid"), "--checks", "animations", "--report", box.at("valid.json")], {
      expectExit: 0,
    });
    damaged = box.run(
      "gamedata verify",
      [box.at("damaged"), "--checks", "animations", "--report", box.at("damaged.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("damaged/"));
  });

  it("should validate a HUD with a linked motion bank", () => {
    expect(valid).toMatchSnapshot();
    expect(box.json("valid.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        checks: [
          { findings: [], status: "skipped", verificationType: "coverage" },
          { findings: [], status: "skipped", verificationType: "collisions" },
          {
            findings: [],
            status: "passed",
            summary:
              "1/1 HUD animations valid, 0/0 HUD item animations valid, 0 motion collisions across 1 HUD namespaces",
            verificationType: "animations",
          },
        ],
        status: "passed",
      },
    });
  });

  it("should report a damaged linked motion bank through its HUD configuration", () => {
    expect(damaged).toMatchSnapshot();
    expect(box.json("damaged.json")).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        checks: [
          { findings: [], status: "skipped", verificationType: "coverage" },
          { findings: [], status: "skipped", verificationType: "collisions" },
          {
            findings: [
              {
                assetPath: "configs/system.ltx",
                message: "Player HUD section [actor_hud] has invalid animations",
                ruleId: "animations.player-hud",
              },
            ],
            status: "failed",
            summary:
              "0/1 HUD animations valid, 0/0 HUD item animations valid, 0 motion collisions across 1 HUD namespaces",
            verificationType: "animations",
          },
        ],
        status: "failed",
      },
    });
  });

  it("should preserve every staged input", () => {
    expect(inputsAfter).toEqual(inputsBefore);
  });

  it("should record the reports as readable documents", () => {
    expect(box.json("valid.json")).toMatchSnapshot();
    expect(box.json("damaged.json")).toMatchSnapshot();
  });

  it("should write only its fixture and reports", () => {
    expect(box.manifest({ normalized: ["valid.json", "damaged.json"] })).toMatchSnapshot();
  });
});
