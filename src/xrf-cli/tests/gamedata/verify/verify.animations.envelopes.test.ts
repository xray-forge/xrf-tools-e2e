import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

describe("gamedata verify animations envelopes", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let damaged: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    for (const root of ["valid", "damaged"]) {
      box.write(`${root}/configs/system.ltx`, "");
    }

    box.copyIn(resource("anims/motion.anm"), "valid/anims/camera_effects/weapon/ak74_shoot.anm");
    box.copyIn(resource("anims/effect.ppe"), "valid/anims/psi.ppe");

    // Each damaged file breaks one way: cut short, carrying a chunk the engine skips and the tools do not keep, keyed
    // to a value no channel can play, or keyed to a noise granularity the engine stops on.
    box.copyTruncated(resource("anims/motion.anm"), "damaged/anims/truncated.anm", 100);
    box.copyIn(resource("anims/motion_extra_chunk.anm"), "damaged/anims/extra_chunk.anm");
    box.copyIn(resource("anims/motion_non_finite.anm"), "damaged/anims/non_finite.anm");
    box.copyTruncated(resource("anims/effect.ppe"), "damaged/anims/truncated.ppe", 60);
    box.copyIn(resource("anims/effect_non_finite.ppe"), "damaged/anims/non_finite.ppe");
    box.copyIn(resource("anims/effect_noise_granularity.ppe"), "damaged/anims/noise_granularity.ppe");
    inputsBefore = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("damaged/"));

    valid = box.run(
      "gamedata verify",
      ["--path", box.at("valid"), "--checks", "animations", "--report", box.at("valid.json")],
      {
        expectExit: 0,
      }
    );
    damaged = box.run(
      "gamedata verify",
      ["--path", box.at("damaged"), "--checks", "animations", "--report", box.at("damaged.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("valid/") || file.path.startsWith("damaged/"));
  });

  it("should read, write back and evaluate a shipped object motion and post-process effect", () => {
    expect(valid).toMatchSnapshot();
    expect(box.json("valid.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        checks: [
          { findings: [], status: "skipped", id: "coverage" },
          { findings: [], status: "skipped", id: "collisions" },
          {
            findings: [],
            status: "passed",
            summary: expect.stringContaining("1/1 object motions valid, 1/1 post-process effects valid"),
            id: "animations",
          },
        ],
        status: "passed",
      },
    });
  });

  it("should report each damaged motion and effect under the rule it breaks", () => {
    expect(damaged).toMatchSnapshot();
    expect(box.json("damaged.json")).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        checks: [
          { findings: [], status: "skipped", id: "coverage" },
          { findings: [], status: "skipped", id: "collisions" },
          {
            findings: [
              {
                subject: "anims/extra_chunk.anm",
                message:
                  "Does not write back to the bytes it was read from: 335 bytes read, 323 written, first difference at byte 323",
                ruleId: "animations.object-motion-round-trip",
              },
              {
                subject: "anims/noise_granularity.ppe",
                message: "Noise granularity reaches 0.000 at time 1.000, which the engine refuses at full strength",
                ruleId: "animations.post-process-noise-granularity",
              },
              {
                subject: "anims/non_finite.anm",
                message: "Channel 'position x' evaluates to NaN at time 0.200",
                ruleId: "animations.object-motion-value",
              },
              {
                subject: "anims/non_finite.ppe",
                message: "Channel 'colour map influence' evaluates to inf at time -5.000",
                ruleId: "animations.post-process-value",
              },
              {
                subject: "anims/truncated.anm",
                message: expect.stringContaining("Failed to read object motion:"),
                ruleId: "animations.object-motion-read",
              },
              {
                subject: "anims/truncated.ppe",
                message: expect.stringContaining("Failed to read post-process effect:"),
                ruleId: "animations.post-process-read",
              },
            ],
            status: "failed",
            summary: expect.stringContaining("0/3 object motions valid, 0/3 post-process effects valid"),
            id: "animations",
          },
        ],
        status: "failed",
      },
    });
  });

  it("should preserve every staged input", () => {
    expect(inputsAfter).toEqual(inputsBefore);
  });

  it("should record the reports as readable documents", () => {
    expect(box.json("valid.json")).toMatchSnapshot();
    expect(box.json("damaged.json")).toMatchSnapshot();
  });

  it("should write only its fixture and reports", () => {
    expect(box.manifest({ normalized: ["valid.json", "damaged.json"] })).toMatchSnapshot();
  });
});
