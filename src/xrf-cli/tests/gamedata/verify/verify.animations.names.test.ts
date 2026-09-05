import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const HUD_MESH = "meshes/dynamics/devices/dev_bolt/dev_bolt_hud.ogf";
const HUD_MOTION_BANK = "meshes/dynamics/devices/dev_bolt/dev_bolt_hud_animation.omf";

function system(requestedMotion: string): string {
  return [
    "[actor_hud]",
    "visual = dynamics\\devices\\dev_bolt\\dev_bolt_hud",
    "position = 0, 0, 0",
    "orientation = 0, 0, 0",
    "ancor_0 = anm",
    "ancor_1 = anm",
    "",
    "[wpn_test]",
    "class = WP_TEST",
    "weapon_class = rifle",
    "$scheme = $item_weapon",
    "hud = wpn_test_hud",
    "",
    "[wpn_test_hud]",
    `anm_idle = ${requestedMotion}`,
    "",
  ].join("\r\n");
}

describe("gamedata verify named HUD animations", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let missing: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    const controls: Array<[string, string]> = [
      ["valid", "idle"],
      ["missing", "missing"],
    ];

    for (const [root, requestedMotion] of controls) {
      box.write(`${root}/configs/system.ltx`, system(requestedMotion));
      box.copyIn(gamedata("meshes/ogf/dev_bolt_hud.ogf"), `${root}/${HUD_MESH}`);
      // The animation check reads this bank's labels; mesh/bone compatibility belongs to the meshes check.
      box.copyIn(gamedata("meshes/omf/wpn_knife_hud_animation.omf"), `${root}/${HUD_MOTION_BANK}`);
    }

    inputsBefore = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("missing/"));

    valid = box.run("gamedata verify", [box.at("valid"), "--checks", "animations", "--report", box.at("valid.json")], {
      expectExit: 0,
    });
    missing = box.run(
      "gamedata verify",
      [box.at("missing"), "--checks", "animations", "--report", box.at("missing.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("missing/"));
  });

  it("should validate the named idle motion from its linked bank", () => {
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

  it("should report a missing named motion from the same linked bank", () => {
    expect(missing).toMatchSnapshot();
    expect(box.json("missing.json")).toMatchObject({
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
    expect(box.json("missing.json")).toMatchSnapshot();
  });

  it("should write only its fixture and reports", () => {
    expect(box.manifest({ normalized: ["valid.json", "missing.json"] })).toMatchSnapshot();
  });
});
