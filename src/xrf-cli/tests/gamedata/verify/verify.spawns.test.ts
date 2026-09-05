import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const SPAWN = "spawns/all.spawn";

describe("gamedata verify spawns", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let damaged: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    for (const root of ["valid", "damaged"]) {
      box.write(`${root}/configs/system.ltx`, "");
    }

    box.copyIn(gamedata(SPAWN), `valid/${SPAWN}`);
    box.copyTruncated(gamedata(SPAWN), `damaged/${SPAWN}`, 1024);
    inputsBefore = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("damaged/"));

    valid = box.run("gamedata verify", [box.at("valid"), "--checks", "spawns", "--report", box.at("valid.json")]);
    damaged = box.run(
      "gamedata verify",
      [box.at("damaged"), "--checks", "spawns", "--report", box.at("damaged.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("damaged/"));
  });

  it("should read the isolated spawn fixture", () => {
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
          { verificationType: "spawns", status: "passed", summary: "1/1 spawns valid", findings: [] },
        ],
      },
    });
  });

  it("should report the truncated spawn's declared chunk length", () => {
    expect(damaged.exitCode).toBe(3);
    expect(box.json("damaged.json")).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        status: "failed",
        skippedMounts: [],
        checks: [
          { verificationType: "coverage", status: "skipped", summary: "Every declared source opened", findings: [] },
          { verificationType: "collisions", status: "skipped", summary: "No unreachable files", findings: [] },
          {
            verificationType: "spawns",
            status: "failed",
            summary: "0/1 spawns valid",
            findings: [
              {
                ruleId: "spawns.read",
                assetPath: SPAWN,
                message:
                  "Failed to read spawn file: Invalid error: Chunk 0x00000001 at position 60 declares 67940 bytes, 964 remain before source end 1024",
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
    expect(box.json("damaged.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["valid.json", "damaged.json"] })).toMatchSnapshot();
  });
});
