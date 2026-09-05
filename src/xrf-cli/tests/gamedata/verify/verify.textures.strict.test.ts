import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";
import { writeTextureDescriptor } from "#/xrf-cli/test/texture-descriptor";

const VALID_DDS = gamedata("textures/ui_empty.dds");

describe("gamedata verify texture companion strictness", () => {
  const box = new Sandbox(__filename);

  let ordinary: CliResult;
  let strict: CliResult;
  let cleanStrict: CliResult;
  let inputs: Array<ManifestFile>;

  beforeAll(() => {
    box.write("companion/configs/system.ltx", "");
    writeTextureDescriptor(box.at("companion/textures/descriptor.thm"), { bump: "bump\\only" });
    box.copyIn(VALID_DDS, "companion/textures/bump/only.dds");

    box.write("clean/configs/system.ltx", "");
    writeTextureDescriptor(box.at("clean/textures/descriptor.thm"), { bump: "bump\\pair" });
    box.copyIn(VALID_DDS, "clean/textures/bump/pair.dds");
    box.copyIn(VALID_DDS, "clean/textures/bump/pair#.dds");

    inputs = box.manifest();

    ordinary = box.run("gamedata verify", [
      box.at("companion"),
      "--checks",
      "textures",
      "--report",
      box.at("ordinary.json"),
    ]);
    strict = box.run(
      "gamedata verify",
      [box.at("companion"), "--checks", "textures", "--strict", "--report", box.at("strict.json")],
      { expectExit: 3 }
    );
    cleanStrict = box.run("gamedata verify", [
      box.at("clean"),
      "--checks",
      "textures",
      "--strict",
      "--report",
      box.at("clean-strict.json"),
    ]);
  });

  it("should pass normally and fail strictly on the identical companion-only input", () => {
    expect(ordinary.exitCode).toBe(0);
    expect(strict.exitCode).toBe(3);
    for (const [report, status, exitCode] of [
      ["ordinary.json", "passed", 0],
      ["strict.json", "failed", 3],
    ] as const) {
      expect(box.json(report)).toMatchObject({
        exitCode,
        outcome: exitCode === 0 ? "success" : "checkFailed",
        result: {
          status,
          checks: expect.arrayContaining([
            {
              duration: "<duration>",
              verificationType: "textures",
              status,
              summary: "1/1 textures valid; 1/1 declared bumps resolved, 1 bumps without a companion",
              findings: [
                {
                  ruleId: "textures.bump-companion",
                  assetPath: "textures/descriptor.thm",
                  message: expect.stringContaining("bump\\only#"),
                },
              ],
            },
          ]),
        },
      });
    }
  });

  it("should pass strict verification when both declared bump files exist", () => {
    expect(cleanStrict.exitCode).toBe(0);
    expect(box.json("clean-strict.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        status: "passed",
        checks: expect.arrayContaining([
          {
            duration: "<duration>",
            verificationType: "textures",
            status: "passed",
            summary: "2/2 textures valid; 1/1 declared bumps resolved",
            findings: [],
          },
        ]),
      },
    });
  });

  it("should preserve every authored input byte while verifying", () => {
    expect(
      box.manifest().filter((file) => !["ordinary.json", "strict.json", "clean-strict.json"].includes(file.path))
    ).toEqual(inputs);
  });

  it("should write readable reports and a complete manifest", () => {
    expect(box.json("ordinary.json")).toMatchSnapshot();
    expect(box.json("strict.json")).toMatchSnapshot();
    expect(box.json("clean-strict.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["ordinary.json", "strict.json", "clean-strict.json"] })).toMatchSnapshot();
  });
});
