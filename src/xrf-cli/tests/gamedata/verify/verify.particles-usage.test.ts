import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const EXISTING_EFFECT = "_SAMPLES_PARTICLES_/DISTORT_01";

describe("gamedata verify particle usage", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let missing: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    for (const root of ["valid", "missing"]) {
      box.copyIn(gamedata("particles.xr"), `${root}/particles.xr`);
      box.write(`${root}/configs/system.ltx`, "");
    }

    // Uppercase and forward slashes exercise reference normalization before lookup.
    box.write("valid/configs/particles.ltx", `[sr_particle]\nname = ${EXISTING_EFFECT}\n`);
    box.write("missing/configs/particles.ltx", "[sr_particle]\nname = missing_particle\n");
    inputsBefore = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("missing/"));

    valid = box.run("gamedata verify", [
      box.at("valid"),
      "--checks",
      "particles-usage",
      "--report",
      box.at("valid.json"),
    ]);
    missing = box.run(
      "gamedata verify",
      [box.at("missing"), "--checks", "particles-usage", "--report", box.at("missing.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("missing/"));
  });

  it("should accept a normalized reference to a library effect", () => {
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
            summary: "1/1 particle references valid; 0/0 spawn files readable; 0 custom data sections unparsed",
            verificationType: "particles-usage",
          },
        ],
        status: "passed",
      },
    });
  });

  it("should report the missing config reference with its rule and source path", () => {
    expect(missing.exitCode).toBe(3);
    expect(box.json("missing.json")).toMatchObject({
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
                assetPath: "configs/particles.ltx",
                message: "Unknown particle reference: [sr_particle] name = missing_particle",
                ruleId: "particles-usage.reference",
              },
            ],
            status: "failed",
            summary: "0/1 particle references valid; 0/0 spawn files readable; 0 custom data sections unparsed",
            verificationType: "particles-usage",
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
    expect(box.json("missing.json")).toMatchSnapshot();
  });

  it("should write the expected reports and files", () => {
    expect(box.manifest({ normalized: ["valid.json", "missing.json"] })).toMatchSnapshot();
  });
});
