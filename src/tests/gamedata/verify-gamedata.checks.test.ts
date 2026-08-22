import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sortedOutput, type CliResult } from "#/test/sandbox";

const GAMEDATA = gamedata();

describe("verify-gamedata check selection", () => {
  const box = new Sandbox(__filename);

  let ltx: CliResult;
  let scripts: CliResult;
  let meshes: CliResult;
  let several: CliResult;

  beforeAll(() => {
    // The configs are in vanilla rather than formatter shape, so the ltx check has findings and
    // answers non-zero on its own.
    ltx = box.run("verify-gamedata", [GAMEDATA, "--checks", "ltx"], { expectExit: 3 });

    // The tree ships no scripts, so this check passes with nothing to say. Running one check at a
    // time is what shows that a non-zero answer comes from a named check rather than the whole run.
    scripts = box.run("verify-gamedata", [GAMEDATA, "--checks", "scripts"]);

    meshes = box.run("verify-gamedata", [GAMEDATA, "--checks", "meshes"], { expectExit: 3 });

    // Several checks after one flag, which is how a caller narrows a run to the part of the tree
    // they touched rather than running all thirteen.
    several = box.run("verify-gamedata", [GAMEDATA, "--checks", "ltx", "scripts"], { expectExit: 3 });
  });

  it("should report findings from one named check", () => {
    expect(ltx).toMatchSnapshot();
  });

  it("should pass a check with nothing to inspect", () => {
    expect(scripts).toMatchSnapshot();
  });

  // Sorted because the meshes check does not order its findings; see sortedOutput.
  it("should verify meshes", () => {
    expect(sortedOutput(meshes)).toMatchSnapshot();
  });

  it("should run several named checks at once", () => {
    expect(several).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
