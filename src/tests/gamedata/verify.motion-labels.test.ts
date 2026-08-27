import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { writeScrambledMotionLabels } from "#/test/omf";
import { Sandbox, type CliResult } from "#/test/sandbox";

/**
 * The meshes sweep reports a bank whose payload labels no longer name its motions.
 *
 * @remarks
 * Release playback never reads a payload label, so a divergence costs a modder nothing at runtime - but a `_DEBUG`
 * engine build asserts on it, and it marks a bank an editor rewrote without keeping the two in step. Reported once per
 * file, because the file is the unit that gets fixed; `xrf-cli omf info` names the individual motions on demand.
 *
 * The corpus is clean, so the bank a visual references is staged into a copied tree.
 */
describe("gamedata verify meets diverging motion labels", () => {
  const box = new Sandbox(__filename);

  // The bank `meshes/ogf/dev_bolt_hud.ogf` names in its kinematics chunk.
  const REFERENCED_BANK = "gamedata/meshes/dynamics/devices/dev_bolt/dev_bolt_hud_animation.omf";

  let swept: CliResult;

  beforeAll(() => {
    const root: string = box.copyIn(gamedata(), "gamedata");

    writeScrambledMotionLabels(gamedata("meshes/omf/wpn_knife_hud_animation.omf"), box.at(REFERENCED_BANK));

    swept = box.run("gamedata verify", [root, "--checks", "meshes"], { expectExit: 3 });
  });

  // Reported alongside the bone finding the same bank earns, rather than instead of it: a sweep
  // that stopped at the first thing wrong with an asset would hide the rest.
  it("should report the diverging labels of a referenced bank", () => {
    expect(swept).toMatchSnapshot();
  });

  it("should write nothing of its own", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
