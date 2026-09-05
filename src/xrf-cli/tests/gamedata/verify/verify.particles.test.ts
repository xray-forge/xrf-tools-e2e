import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

describe("gamedata verify particle libraries", () => {
  const box = new Sandbox(__filename);

  let damaged: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    box.write("gamedata/configs/system.ltx", "");
    box.copyTruncated(gamedata("particles.xr"), "gamedata/particles.xr", 500);
    inputsBefore = box.manifest().filter((file) => file.path.startsWith("gamedata/"));

    damaged = box.run(
      "gamedata verify",
      [box.at("gamedata"), "--checks", "particles", "--report", box.at("report.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("gamedata/"));
  });

  it("should report the truncated library as a failed particle check", () => {
    expect(damaged.exitCode).toBe(3);
    expect(box.json("report.json")).toMatchObject({
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
                assetPath: "particles.xr",
                message: expect.stringContaining("Failed to read particle library:"),
                ruleId: "particles.library",
              },
            ],
            status: "failed",
            summary: "0/1 particle library files valid",
            verificationType: "particles",
          },
        ],
        status: "failed",
      },
    });
  });

  it("should preserve every staged input", () => {
    expect(inputsAfter).toEqual(inputsBefore);
  });

  it("should record the report as a readable document", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should write the expected report and files", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
