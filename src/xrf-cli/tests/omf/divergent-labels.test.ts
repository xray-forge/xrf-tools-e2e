import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { envelopeAt } from "#/test/envelope";
import { writeScrambledMotionLabels } from "#/test/omf";
import { Sandbox, type CliResult } from "#/test/sandbox";

/**
 * A bank whose payload labels and motion ids mean nothing, which is what a few third-party banks carry.
 *
 * @remarks
 * A motion is named by its definition and reached by its ordinal, so neither field is an identity. The tools must read
 * such a bank as they read any other: real names, real keyframe counts, and every byte preserved on the way out. The
 * corpus holds no bank like this, so one is staged from a clean one, scrambling only the two fields at issue.
 */
describe("omf commands meet scrambled motion labels", () => {
  const box = new Sandbox(__filename);

  let source: string;
  let info: CliResult;

  beforeAll(() => {
    source = writeScrambledMotionLabels(gamedata("meshes/omf/wpn_svd_hud_animation.omf"), box.at("scrambled.omf"));

    info = box.run("omf info", ["--path", source, "--verbose", "--report", box.at("scrambled.json")]);

    box.run("omf info", [
      "--path",
      gamedata("meshes/omf/wpn_svd_hud_animation.omf"),
      "--silent",
      "--report",
      box.at("clean.json"),
    ]);
  });

  it("should name every motion from its definition and say how many labels diverge", () => {
    expect(info).toMatchSnapshot();
  });

  // The staged file differs from its source only in fields playback ignores, so everything a report
  // says about the motions themselves has to be identical.
  it("should report the same motions as the bank it was staged from", () => {
    const scrambledMotions = (envelopeAt(box.at("scrambled.json")).result as Record<string, unknown>).motions;
    const cleanMotions = (envelopeAt(box.at("clean.json")).result as Record<string, unknown>).motions;

    expect(scrambledMotions).toEqual(
      (cleanMotions as Array<Record<string, unknown>>).map((motion) => ({ ...motion, labelDiverges: true }))
    );
  });

  it("should keep the clean bank free of divergence", () => {
    expect(box.json("clean.json")).toMatchSnapshot();
  });

  // Nothing is normalised on the way through, so an unmodified read and write is byte for byte.
  it("should repack a scrambled bank byte for byte", () => {
    expect(box.run("omf repack", ["--path", source, "--verify", "--silent", "--json"])).toMatchSnapshot();
  });

  it("should rename motions without inventing labels for them", () => {
    const map: string = box.write("rename-map.json", `${JSON.stringify({ idle: "stand" }, undefined, 2)}\n`);

    box.run("omf rename-motions", ["--path", source, "--dest", box.at("renamed.omf"), "--map", map, "--silent"]);

    expect(box.run("omf info", ["--path", box.at("renamed.omf")])).toMatchSnapshot();
  });

  it("should filter motions and leave the survivors readable", () => {
    box.run("omf filter-motions", ["--path", source, "--dest", box.at("filtered.omf"), "--keep", "idle", "--silent"]);

    expect(box.run("omf info", ["--path", box.at("filtered.omf")])).toMatchSnapshot();
  });
});
