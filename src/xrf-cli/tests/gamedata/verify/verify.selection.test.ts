import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const GAMEDATA = gamedata();

describe("gamedata verify check selection", () => {
  const box = new Sandbox(__filename);

  let ltx: CliResult;
  let scripts: CliResult;
  let several: CliResult;
  let repeated: CliResult;
  let unknown: CliResult;
  let coverage: CliResult;
  let collisions: CliResult;

  beforeAll(() => {
    // The configs are in vanilla rather than formatter shape, so the ltx check has findings and
    // answers non-zero on its own.
    ltx = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx"], { expectExit: 3 });

    // The tree ships no scripts, so this check passes with nothing to say. Running one check at a
    // time is what shows that a non-zero answer comes from a named check rather than the whole run.
    scripts = box.run("gamedata verify", [GAMEDATA, "--checks", "scripts"]);

    // Several checks after one flag, which is how a caller narrows a run to the part of the tree
    // they touched rather than running all thirteen.
    several = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "scripts"], { expectExit: 3 });

    // Repetition is accepted as an ergonomic command line spelling, but selection runs a check once
    // in first-requested order rather than paying the full verification cost twice.
    repeated = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "ltx", "scripts"], { expectExit: 3 });

    unknown = box.run("gamedata verify", [GAMEDATA, "--checks", "unknown"], { expectExit: 2 });
    coverage = box.run("gamedata verify", [GAMEDATA, "--checks", "coverage"], { expectExit: 2 });
    collisions = box.run("gamedata verify", [GAMEDATA, "--checks", "collisions"], { expectExit: 2 });
  });

  it("should report findings from one named check", () => {
    expect(ltx).toMatchSnapshot();
  });

  it("should pass a check with nothing to inspect", () => {
    expect(scripts).toMatchSnapshot();
  });

  it("should run several named checks at once", () => {
    expect(several).toMatchSnapshot();
  });

  it("should run a repeated check only once", () => {
    expect(repeated).toEqual(several);
  });

  it("should reject an unknown check", () => {
    expect(unknown).toMatchSnapshot();
  });

  it("should reject the always-run coverage and collision checks as selections", () => {
    expect(coverage).toMatchSnapshot();
    expect(collisions).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
