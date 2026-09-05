import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";
import { writeTextureDescriptor } from "#/xrf-cli/test/texture-descriptor";

const VALID_DDS = gamedata("textures/ui_empty.dds");

describe("gamedata verify texture bump declarations", () => {
  const box = new Sandbox(__filename);

  let verification: CliResult;
  let inputs: Array<ManifestFile>;

  beforeAll(() => {
    const root = box.at("gamedata");

    box.write("gamedata/configs/system.ltx", "");
    writeTextureDescriptor(box.at("gamedata/textures/descriptors/complete.thm"), { bump: "bump\\complete" });
    writeTextureDescriptor(box.at("gamedata/textures/descriptors/missing-bump.thm"), { bump: "bump\\missing" });
    writeTextureDescriptor(box.at("gamedata/textures/descriptors/missing-companion.thm"), {
      bump: "bump\\companion",
    });
    writeTextureDescriptor(box.at("gamedata/textures/descriptors/disabled.thm"), {
      bump: "bump\\disabled",
      mode: 1,
    });

    // There are deliberately no `descriptors/*.dds` files: LoadTHM walks the descriptor itself, not a base-texture
    // pair, so the resolved bump proves an absent base DDS cannot hide the declaration.
    box.copyIn(VALID_DDS, "gamedata/textures/bump/complete.dds");
    box.copyIn(VALID_DDS, "gamedata/textures/bump/complete#.dds");
    box.copyIn(VALID_DDS, "gamedata/textures/bump/companion.dds");

    inputs = box.manifest();

    verification = box.run("gamedata verify", [root, "--checks", "textures", "--report", box.at("report.json")], {
      expectExit: 3,
    });
  });

  it("should count a resolved orphan descriptor while naming missing bump and companion fixes separately", () => {
    expect(verification.exitCode).toBe(3);
    expect(box.json("report.json")).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        status: "failed",
        checks: expect.arrayContaining([
          {
            duration: "<duration>",
            verificationType: "textures",
            status: "failed",
            summary: "3/3 textures valid; 2/3 declared bumps resolved, 1 bumps without a companion",
            findings: [
              {
                ruleId: "textures.bump",
                assetPath: "textures/descriptors/missing-bump.thm",
                message: expect.stringContaining("bump\\missing"),
              },
              {
                ruleId: "textures.bump-companion",
                assetPath: "textures/descriptors/missing-companion.thm",
                message: expect.stringContaining("bump\\companion#"),
              },
            ],
          },
        ]),
      },
    });
  });

  it("should preserve every authored input byte while verifying", () => {
    expect(box.manifest().filter((file) => file.path !== "report.json")).toEqual(inputs);
  });

  it("should write a readable report and complete manifest", () => {
    expect(box.json("report.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
