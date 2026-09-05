import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const WEATHER_DEFINITIONS: Record<string, string> = {
  "configs/environment/ambients.ltx": "[ambient_ok]\n",
  "configs/environment/suns.ltx": "[sun_ok]\n",
  "configs/environment/thunderbolt_collections.ltx": "[bolt_ok]\nbolt =\n",
  "configs/environment/thunderbolts.ltx": "[bolt]\n",
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
sun_longitude = 0
sun_shafts_intensity = 0
thunderbolt_collection = bolt_ok
thunderbolt_duration = 0
thunderbolt_period = 0
water_intensity = 1
wind_direction = 0
wind_velocity = 0
`;
}

describe("gamedata verify weather cycles", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let broken: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    for (const root of ["valid", "broken"]) {
      for (const [path, content] of Object.entries(WEATHER_DEFINITIONS)) {
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

    valid = box.run("gamedata verify", [box.at("valid"), "--checks", "weathers", "--report", box.at("valid.json")]);
    broken = box.run("gamedata verify", [box.at("broken"), "--checks", "weathers", "--report", box.at("broken.json")], {
      expectExit: 3,
    });
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("broken/"));
  });

  it("should validate a complete weather cycle with resolved definitions and textures", () => {
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
            summary: "1/1 weather files valid",
            verificationType: "weathers",
          },
        ],
        status: "passed",
      },
    });
  });

  it("should report the unsupported ambient reference at the weather cycle", () => {
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
                ruleId: "weathers.validation",
              },
            ],
            status: "failed",
            summary: "0/1 weather files valid",
            verificationType: "weathers",
          },
        ],
        status: "failed",
      },
    });
  });

  it("should preserve every staged input", () => {
    expect(inputsAfter).toEqual(inputsBefore);
  });

  it("should record both reports as readable documents", () => {
    expect(box.json("valid.json")).toMatchSnapshot();
    expect(box.json("broken.json")).toMatchSnapshot();
  });

  it("should write the expected reports and files", () => {
    expect(box.manifest({ normalized: ["valid.json", "broken.json"] })).toMatchSnapshot();
  });
});
