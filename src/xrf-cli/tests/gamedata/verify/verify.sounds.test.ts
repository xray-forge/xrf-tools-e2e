import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const SOUND_PATH = "sounds/weapons/no_sound.ogg";

describe("gamedata verify sounds", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let missing: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    box.write("valid/configs/system.ltx", "[test]\r\nsnd_test = weapons\\no_sound\r\n");
    box.write("missing/configs/system.ltx", "[test]\r\nsnd_test = weapons\\missing\r\n");
    box.copyIn(resource("sounds/no_sound.ogg"), `valid/${SOUND_PATH}`);
    box.copyIn(resource("sounds/no_sound.ogg"), `missing/${SOUND_PATH}`);
    inputsBefore = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("missing/"));

    valid = box.run("gamedata verify", [
      box.at("valid"),
      "--checks",
      "sounds",
      "--strict",
      "--report",
      box.at("valid.json"),
    ]);
    missing = box.run(
      "gamedata verify",
      [box.at("missing"), "--checks", "sounds", "--strict", "--report", box.at("missing.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("missing/"));
  });

  it("should read a sound and resolve its declared reference", () => {
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
          {
            verificationType: "sounds",
            status: "passed",
            summary: "1/1 sounds valid; 1/1 sound references valid",
            findings: [],
          },
        ],
      },
    });
  });

  it("should report a missing direct sound reference while retaining the readable sound", () => {
    expect(missing.exitCode).toBe(3);
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
            verificationType: "sounds",
            status: "failed",
            summary: "1/1 sounds valid; 0/1 sound references valid",
            findings: [
              {
                ruleId: "sounds.references",
                assetPath: "configs/system.ltx",
                message: "Unknown sound reference: [test] snd_test = weapons\\missing",
              },
            ],
          },
        ],
      },
    });
  });

  it("should preserve every authored input byte", () => {
    expect(inputsAfter).toEqual(inputsBefore);
  });

  it("should record readable reports and only expected artifacts", () => {
    expect(box.json("valid.json")).toMatchSnapshot();
    expect(box.json("missing.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["valid.json", "missing.json"] })).toMatchSnapshot();
  });
});
