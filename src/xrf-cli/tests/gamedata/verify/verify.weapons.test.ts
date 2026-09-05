import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const WEAPON_VISUAL = "meshes/dynamics/devices/dev_bolt/dev_bolt_hud.ogf";
const BOLT_MOTION_BANK = "meshes/dynamics/devices/dev_bolt/dev_bolt_hud_animation.omf";
const MP5_MOTION_BANK = "meshes/omf/wpn_mp5_hud_animation.omf";
const VALID_SYSTEM = [
  "[wpn_test]",
  "class = WP_AK74",
  "weapon_class = assault_rifle",
  "$scheme = $item_weapon",
  "visual = dynamics\\devices\\dev_bolt\\dev_bolt_hud",
  "hud = wpn_test_hud",
  "snd_draw = $no_sound",
  "snd_empty = $no_sound",
  "snd_holster = $no_sound",
  "snd_reload = $no_sound",
  "snd_shoot = $no_sound",
  "",
  "[wpn_test_hud]",
  "item_visual = dynamics\\devices\\dev_bolt\\dev_bolt_hud",
  "",
].join("\r\n");

describe("gamedata verify weapons", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let missingVisual: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    box.write("valid/configs/system.ltx", VALID_SYSTEM);
    // Both OMF references must resolve for weapon validation. Bone compatibility belongs to the meshes check;
    // required sound fields use the verifier's $no_sound sentinel.
    box.copyIn(gamedata("meshes/ogf/dev_bolt_hud.ogf"), `valid/${WEAPON_VISUAL}`);
    box.copyIn(gamedata("meshes/omf/wpn_knife_hud_animation.omf"), `valid/${BOLT_MOTION_BANK}`);
    box.copyIn(gamedata("meshes/omf/wpn_mp5_hud_animation.omf"), `valid/${MP5_MOTION_BANK}`);
    box.copyIn(box.at("valid"), "missing");
    box.write(
      "missing/configs/system.ltx",
      VALID_SYSTEM.replace("dynamics\\devices\\dev_bolt\\dev_bolt_hud", "dynamics\\devices\\dev_bolt\\missing")
    );
    inputsBefore = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("missing/"));

    valid = box.run("gamedata verify", [box.at("valid"), "--checks", "weapons", "--report", box.at("valid.json")]);
    missingVisual = box.run(
      "gamedata verify",
      [box.at("missing"), "--checks", "weapons", "--report", box.at("missing.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("missing/"));
  });

  it("should validate a weapon with parsed world and HUD visuals", () => {
    expect(valid.exitCode).toBe(0);
    expect(box.json("valid.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        status: "passed",
        skippedMounts: [],
        checks: [
          { verificationType: "coverage", status: "skipped", summary: "Every declared source opened", findings: [] },
          { verificationType: "collisions", status: "skipped", summary: "No unreachable files", findings: [] },
          { verificationType: "weapons", status: "passed", summary: "1/1 weapons valid", findings: [] },
        ],
      },
    });
  });

  it("should report the weapon section when its world visual is missing", () => {
    expect(missingVisual.exitCode).toBe(3);
    expect(box.json("missing.json")).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        status: "failed",
        skippedMounts: [],
        checks: [
          { verificationType: "coverage", status: "skipped", summary: "Every declared source opened", findings: [] },
          { verificationType: "collisions", status: "skipped", summary: "No unreachable files", findings: [] },
          {
            verificationType: "weapons",
            status: "failed",
            summary: "0/1 weapons valid",
            findings: [
              {
                ruleId: "weapons.validation",
                assetPath: "configs/system.ltx",
                message: "Weapon section [wpn_test] is invalid",
              },
            ],
          },
        ],
      },
    });
  });

  it("should preserve every staged input byte", () => {
    expect(inputsAfter).toEqual(inputsBefore);
  });

  it("should record readable reports and only expected artifacts", () => {
    expect(box.json("valid.json")).toMatchSnapshot();
    expect(box.json("missing.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["valid.json", "missing.json"] })).toMatchSnapshot();
  });
});
