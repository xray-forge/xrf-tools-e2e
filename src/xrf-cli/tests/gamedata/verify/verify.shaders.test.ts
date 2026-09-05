import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const SHADER_SCRIPT = "function normal(shader, t_base, t_second, t_detail) end\n";
const INCLUDED_SOURCE = '#include "shared/common.h"\n';
const MISSING_SOURCE = '#include "shared/missing.h"\n';

describe("gamedata verify renderer shaders", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let damaged: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    box.write("valid/configs/system.ltx", "");
    // Root scripts are Lua, while `.ps` sources resolve their includes from the shared shader root.
    box.write("valid/shaders/r3/basic.s", SHADER_SCRIPT);
    box.write("valid/shaders/r3/main.ps", INCLUDED_SOURCE);
    box.write("valid/shaders/shared/common.h", "float value;\n");
    box.copyIn(box.at("valid"), "damaged");
    box.write("damaged/shaders/r3/main.ps", MISSING_SOURCE);
    inputsBefore = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("damaged/"));

    valid = box.run("gamedata verify", [box.at("valid"), "--checks", "shaders", "--report", box.at("valid.json")]);
    damaged = box.run(
      "gamedata verify",
      [box.at("damaged"), "--checks", "shaders", "--report", box.at("damaged.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("damaged/"));
  });

  it("should validate a shader script and its resolved sources", () => {
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
            verificationType: "shaders",
            status: "passed",
            summary: "1 shader scripts and 2 shader sources checked, 0 problems",
            findings: [],
          },
        ],
      },
    });
  });

  it("should name a missing source include while retaining the checked shader script", () => {
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
            verificationType: "shaders",
            status: "failed",
            summary: "1 shader scripts and 1 shader sources checked, 1 problems",
            findings: [
              {
                ruleId: "shaders.include-missing",
                assetPath: "shaders/r3/main.ps",
                message:
                  "Not found error: Shader shaders\\r3\\main.ps includes missing file 'shared/missing.h' on line 1",
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
    expect(box.json("damaged.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["valid.json", "damaged.json"] })).toMatchSnapshot();
  });
});
