import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

describe("gamedata verify texture files", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let damaged: CliResult;
  let inputs: Array<ManifestFile>;

  beforeAll(() => {
    box.write("valid/configs/system.ltx", "");
    box.copyIn(gamedata("textures/ui_empty.dds"), "valid/textures/readable.dds");
    box.copyIn(box.at("valid"), "damaged");
    box.copyTruncated(gamedata("textures/ui_empty.dds"), "damaged/textures/truncated.dds", 64);
    inputs = box.manifest();

    valid = box.run("gamedata verify", [box.at("valid"), "--checks", "textures", "--report", box.at("valid.json")]);
    damaged = box.run(
      "gamedata verify",
      [box.at("damaged"), "--checks", "textures", "--report", box.at("damaged.json")],
      { expectExit: 3 }
    );
  });

  it("should validate a readable DDS with nonzero checked work", () => {
    expect(valid.exitCode).toBe(0);
    expect(box.json("valid.json")).toMatchObject({
      outcome: "success",
      result: {
        status: "passed",
        checks: expect.arrayContaining([
          {
            duration: "<duration>",
            verificationType: "textures",
            status: "passed",
            summary: "1/1 textures valid; 0/0 declared bumps resolved",
            findings: [],
          },
        ]),
      },
    });
  });

  it("should name the truncated texture while still validating its readable neighbor", () => {
    expect(damaged.exitCode).toBe(3);
    expect(box.json("damaged.json")).toMatchObject({
      outcome: "checkFailed",
      result: {
        status: "failed",
        checks: expect.arrayContaining([
          {
            duration: "<duration>",
            verificationType: "textures",
            status: "failed",
            summary: "1/2 textures valid; 0/0 declared bumps resolved",
            findings: [
              {
                ruleId: "textures.read",
                assetPath: "textures/truncated.dds",
                message: expect.any(String),
              },
            ],
          },
        ]),
      },
    });
  });

  it("should preserve every input byte", () => {
    expect(box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("damaged/"))).toEqual(
      inputs
    );
  });

  it("should write the expected reports and files", () => {
    expect(box.json("valid.json")).toMatchSnapshot();
    expect(box.json("damaged.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["valid.json", "damaged.json"] })).toMatchSnapshot();
  });
});
