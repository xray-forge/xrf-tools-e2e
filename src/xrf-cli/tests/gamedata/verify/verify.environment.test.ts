import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

/** Every definition a keyframe below names, written whole, so the engine would load each one. */
const ENVIRONMENT_DEFINITIONS: Record<string, string> = {
  "configs/environment/ambients.ltx":
    "[ambient_ok]\nsound_channels = channel_ok\nmin_effect_period = 30\nmax_effect_period = 60\n",
  "configs/environment/environment.ltx": `[environment]
altitude = 20
delta_longitude = 30
fog_color = 0.1
min_dist_factor = 0.94
second_propability = 0.5
sky_color = 0.1
sun_color = 0.9
tilt = 17
`,
  "configs/environment/sound_channels.ltx": `[channel_ok]
max_distance = 40
min_distance = 20
period0 = 25000
period1 = 30000
period2 = 5000
period3 = 20000
sounds = ambient\\wind_1
`,
  "configs/environment/suns.ltx":
    "[sun_ok]\nblend_down_time = 60\nblend_rise_time = 60\nflares = off\ngradient = off\nsun = off\n",
  "configs/environment/thunderbolt_collections.ltx": "[bolt_ok]\nbolt =\n",
  "configs/environment/thunderbolts.ltx": `[bolt]
color_anim = weathers\\thunderbolt_00
gradient_center_opacity = 0.6
gradient_center_radius = 2, 1
gradient_center_shader = effects\\sun
gradient_center_texture = fx\\fx_thunderbolts_gradient
gradient_top_opacity = 0.6
gradient_top_radius = 0.5, 0.25
gradient_top_shader = effects\\sun
gradient_top_texture = fx\\fx_thunderbolts_gradient
lightning_model = dm\\dm_lightning-01.dm
sound = nature\\thunder-0
`,
  "configs/system.ltx": "",
};

function weatherSection(time: string, ambient: string, sky: string): string {
  return `[${time}]
ambient = ${ambient}
ambient_color = 0, 0, 0
clouds_color = 0, 0, 0, 1
clouds_texture = sky\\clouds
far_plane = 500
fog_color = 0, 0, 0
fog_density = 0.25
fog_distance = 500
hemisphere_color = 0, 0, 0, 1
rain_color = 1, 1, 1
rain_density = 0
sky_color = 1, 1, 1
sky_rotation = 0
sky_texture = sky\\${sky}
sun = sun_ok
sun_altitude = 0
sun_color = 0, 0, 0
sun_longitude = -10
sun_shafts_intensity = 0
thunderbolt_collection = bolt_ok
thunderbolt_duration = 0.5
thunderbolt_period = 10
water_intensity = 1
wind_direction = 0
wind_velocity = 0
`;
}

describe("gamedata verify environment", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let broken: CliResult;
  let extended: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    for (const root of ["valid", "broken"]) {
      for (const [path, content] of Object.entries(ENVIRONMENT_DEFINITIONS)) {
        box.write(`${root}/${path}`, content);
      }

      for (const texture of ["clouds", "first", "first#small", "second", "second#small"]) {
        box.copyIn(gamedata("textures/ui_empty.dds"), `${root}/textures/sky/${texture}.dds`);
      }
    }

    box.write(
      "valid/configs/environment/weathers/test.ltx",
      `${weatherSection("00:00:00", "ambient_ok", "first")}\n${weatherSection("12:00:00", "ambient_ok", "second")}`
    );
    box.write(
      "broken/configs/environment/weathers/test.ltx",
      `${weatherSection("00:00:00", "absent_ambient", "first")}\n${weatherSection("12:00:00", "ambient_ok", "second")}`
    );
    inputsBefore = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("broken/"));

    valid = box.run("gamedata verify", [box.at("valid"), "--checks", "environment", "--report", box.at("valid.json")]);
    broken = box.run(
      "gamedata verify",
      [box.at("broken"), "--checks", "environment", "--report", box.at("broken.json")],
      { expectExit: 3 }
    );
    extended = box.run(
      "gamedata verify",
      [box.at("valid"), "--checks", "environment", "--engine", "extended", "--report", box.at("extended.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("broken/"));
  });

  it("should pass a tree whose every config the engine loads whole", () => {
    expect(valid.exitCode).toBe(0);
    expect(box.json("valid.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        checks: [
          { findings: [], status: "skipped", verificationType: "coverage" },
          { findings: [], status: "skipped", verificationType: "collisions" },
          {
            duration: "<duration>",
            findings: [],
            status: "passed",
            summary: "7/7 environment configs valid",
            verificationType: "environment",
          },
        ],
        status: "passed",
      },
    });
  });

  it("should report the missing ambient at the keyframe naming it", () => {
    expect(broken.exitCode).toBe(3);
    expect(box.json("broken.json")).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        checks: [
          { findings: [], status: "skipped", verificationType: "coverage" },
          { findings: [], status: "skipped", verificationType: "collisions" },
          {
            duration: "<duration>",
            findings: [
              {
                assetPath: "configs/environment/weathers/test.ltx",
                message: "Weather [00:00:00] references missing ambient [absent_ambient]",
                ruleId: "environment.reference",
              },
            ],
            status: "failed",
            summary: "6/7 environment configs valid",
            verificationType: "environment",
          },
        ],
        status: "failed",
      },
    });
  });

  // Monolith requires an ambient's `effects` and stands the sun by a table of its own; a vanilla tree has neither.
  it("should read the same tree by the extended engine's rules when told to", () => {
    expect(extended.exitCode).toBe(3);
    expect(box.json("extended.json")).toMatchObject({
      result: {
        checks: [
          {},
          {},
          {
            findings: [
              {
                assetPath: "configs/environment/ambients.ltx",
                message: "Ambient [ambient_ok] is missing required field [effects]",
                ruleId: "environment.engine",
              },
              {
                assetPath: "configs/environment/sun_positions.ltx",
                message: "There is no environment\\sun_positions.ltx, which the engine stands the sun by",
                ruleId: "environment.engine",
              },
            ],
            verificationType: "environment",
          },
        ],
      },
    });
  });

  it("should preserve every staged input", () => {
    expect(inputsAfter).toEqual(inputsBefore);
  });

  it("should record the reports as readable documents", () => {
    expect(box.json("valid.json")).toMatchSnapshot();
    expect(box.json("broken.json")).toMatchSnapshot();
    expect(box.json("extended.json")).toMatchSnapshot();
  });

  it("should write the expected reports and files", () => {
    expect(box.manifest({ normalized: ["valid.json", "broken.json", "extended.json"] })).toMatchSnapshot();
  });
});
