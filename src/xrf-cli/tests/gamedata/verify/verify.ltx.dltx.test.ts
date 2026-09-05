import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type ManifestFile } from "#/xrf-cli/test/sandbox";

describe("gamedata verify resolved DLTX schema", () => {
  const box = new Sandbox(__filename);

  let inputs: Array<ManifestFile>;

  beforeAll(() => {
    box.write("clean/configs/system.ltx", "[wpn_test]\r\n$scheme = $weapon\r\ncost = 4000\r\nrpm = 600\r\n");
    box.write("clean/configs/weapons.scheme.ltx", "[$weapon]\r\n$strict = true\r\ncost = u32\r\nrpm = u16\r\n");
    box.copyIn(box.at("clean"), "patched");
    box.write("patched/configs/mod_system_test.ltx", "![wpn_test]\r\ncost = expensive\r\n!rpm\r\n");
    inputs = box.manifest();

    box.run("gamedata verify", [box.at("clean"), "--checks", "ltx", "--dltx", "--report", box.at("clean.json")]);
    box.run("gamedata verify", [box.at("patched"), "--checks", "ltx", "--dltx", "--report", box.at("patched.json")], {
      expectExit: 3,
    });
  });

  it("should validate the formatted section before any patch changes it", () => {
    expect(box.json("clean.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        status: "passed",
        checks: expect.arrayContaining([
          {
            duration: "<duration>",
            verificationType: "ltx",
            status: "passed",
            summary: "2/2 LTX files formatted; 1/1 sections valid",
            findings: [],
          },
        ]),
      },
    });
  });

  it("should reject the patched value and removed required field at their declaring section", () => {
    expect(box.json("patched.json")).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        status: "failed",
        checks: expect.arrayContaining([
          {
            duration: "<duration>",
            verificationType: "ltx",
            status: "failed",
            summary: "3/3 LTX files formatted; 0/1 sections valid",
            findings: [
              {
                assetPath: "configs/system.ltx",
                ruleId: "ltx.schema",
                message: "[wpn_test] cost: Invalid value, unsigned 32 bit number is expected, got 'expensive'",
              },
              {
                assetPath: "configs/system.ltx",
                ruleId: "ltx.schema",
                message: "[wpn_test] rpm: Required field was not provided",
              },
            ],
          },
        ]),
      },
    });
  });

  it("should preserve the base, scheme and patch bytes", () => {
    expect(box.manifest().filter((file) => file.path.startsWith("clean/") || file.path.startsWith("patched/"))).toEqual(
      inputs
    );
  });

  it("should write the expected reports and files", () => {
    expect(box.json("clean.json")).toMatchSnapshot();
    expect(box.json("patched.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["clean.json", "patched.json"] })).toMatchSnapshot();
  });
});
