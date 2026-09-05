import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const VALID_SCRIPT = "local value = 1";
const MALFORMED_SCRIPT = "local value =";

describe("gamedata verify scripts", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let malformed: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    box.write("valid/configs/system.ltx", "");
    box.write("valid/scripts/valid.script", VALID_SCRIPT);
    box.copyIn(box.at("valid"), "malformed");
    box.write("malformed/scripts/broken.script", MALFORMED_SCRIPT);
    inputsBefore = box
      .manifest()
      .filter((file) => file.path.startsWith("valid/") || file.path.startsWith("malformed/"));

    valid = box.run("gamedata verify", [box.at("valid"), "--checks", "scripts", "--report", box.at("valid.json")]);
    malformed = box.run(
      "gamedata verify",
      [box.at("malformed"), "--checks", "scripts", "--report", box.at("malformed.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("malformed/"));
  });

  it("should parse a runtime script and report nonempty checked work", () => {
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
          { verificationType: "scripts", status: "passed", summary: "1/1 scripts valid", findings: [] },
        ],
      },
    });
  });

  it("should report the LuaJIT parser rejection while retaining its valid neighbor", () => {
    expect(malformed.exitCode).toBe(3);
    expect(box.json("malformed.json")).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        status: "failed",
        skippedMounts: [],
        checks: [
          { verificationType: "coverage", status: "skipped", summary: "Every declared source opened", findings: [] },
          { verificationType: "collisions", status: "skipped", summary: "No unreachable files", findings: [] },
          {
            verificationType: "scripts",
            status: "failed",
            summary: "1/2 scripts valid",
            findings: [
              {
                ruleId: "scripts.read",
                assetPath: "scripts/broken.script",
                message:
                  "Verify error: Failed to check LuaJIT script file: scripts\\broken.script, errors: error occurred while creating ast: unexpected token `=`. (starting from line 1, character 13 and ending on line 1, character 14)\nadditional information: expected an expression",
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
    expect(box.json("malformed.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["valid.json", "malformed.json"] })).toMatchSnapshot();
  });
});
