import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sortedFindings, type CliResult } from "#/test/sandbox";

const GAMEDATA = gamedata();

describe("gamedata verify check selection", () => {
  const box = new Sandbox(__filename);

  let ltx: CliResult;
  let scripts: CliResult;
  let meshes: CliResult;
  let meshesAgain: CliResult;
  let meshesThird: CliResult;
  let several: CliResult;

  beforeAll(() => {
    // The configs are in vanilla rather than formatter shape, so the ltx check has findings and
    // answers non-zero on its own.
    ltx = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx"], { expectExit: 3 });

    // The tree ships no scripts, so this check passes with nothing to say. Running one check at a
    // time is what shows that a non-zero answer comes from a named check rather than the whole run.
    scripts = box.run("gamedata verify", [GAMEDATA, "--checks", "scripts"]);

    // Run three times because the check works in parallel: one run cannot show whether the finding
    // set is stable, and repeating it is what turns a flaky snapshot into a stated expectation.
    meshes = box.run("gamedata verify", [GAMEDATA, "--checks", "meshes"], { expectExit: 3 });
    meshesAgain = box.run("gamedata verify", [GAMEDATA, "--checks", "meshes"], { expectExit: 3 });
    meshesThird = box.run("gamedata verify", [GAMEDATA, "--checks", "meshes"], { expectExit: 3 });

    // Several checks after one flag, which is how a caller narrows a run to the part of the tree
    // they touched rather than running all thirteen.
    several = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "scripts"], { expectExit: 3 });
  });

  it("should report findings from one named check", () => {
    expect(ltx).toMatchSnapshot();
  });

  it("should pass a check with nothing to inspect", () => {
    expect(scripts).toMatchSnapshot();
  });

  it("should verify meshes", () => {
    expect(sortedFindings(meshes)).toMatchSnapshot();
  });

  // The findings are the same set on every run, which is the part that carries meaning. The order
  // they reach the console in is not: they are logged from the rayon workers as each finishes, so
  // three runs of one binary print them three ways. See the `sortedFindings` remark.
  it("should report the same findings across repeated runs", () => {
    expect(sortedFindings(meshesAgain)).toEqual(sortedFindings(meshes));
    expect(sortedFindings(meshesThird)).toEqual(sortedFindings(meshes));
  });

  it("should run several named checks at once", () => {
    expect(several).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
