import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type ManifestFile } from "#/xrf-cli/test/sandbox";
import { writeTextureDescriptor } from "#/xrf-cli/test/texture-descriptor";

describe("gamedata verify ineffective texture declarations", () => {
  const box = new Sandbox(__filename);

  let inputs: Array<ManifestFile>;

  beforeAll(() => {
    box.write("gamedata/configs/system.ltx", "");
    writeTextureDescriptor(box.at("gamedata/textures/empty.thm"), { bump: "" });
    // Texture type 2 is a bump-map descriptor, which the engine does not use as a surface material.
    writeTextureDescriptor(box.at("gamedata/textures/disqualified.thm"), { bump: "detail", textureType: 2 });
    inputs = box.manifest();

    box.run("gamedata verify", [box.at("gamedata"), "--checks", "textures", "--report", box.at("ordinary.json")]);
    box.run(
      "gamedata verify",
      [box.at("gamedata"), "--checks", "textures", "--strict", "--report", box.at("strict.json")],
      { expectExit: 3 }
    );
  });

  it("should name both ineffective declarations and fail only under strict mode", () => {
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
              summary: "0/0 textures valid; 0/0 declared bumps resolved, 2 bump declarations the engine never reads",
              findings: [
                {
                  ruleId: "textures.bump-declaration",
                  assetPath: "textures/disqualified.thm",
                  message: expect.stringContaining("Bump Map"),
                },
                {
                  ruleId: "textures.bump-declaration",
                  assetPath: "textures/empty.thm",
                  message: expect.stringContaining("empty name"),
                },
              ],
            },
          ]),
        },
      });
    }
  });

  it("should preserve the declarations in both modes", () => {
    expect(box.manifest().filter((file) => file.path.startsWith("gamedata/"))).toEqual(inputs);
  });

  it("should write the expected reports and files", () => {
    expect(box.json("ordinary.json")).toMatchSnapshot();
    expect(box.json("strict.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["ordinary.json", "strict.json"] })).toMatchSnapshot();
  });
});
