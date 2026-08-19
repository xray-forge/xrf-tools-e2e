import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const GAMEDATA = gamedata();

describe("verify-gamedata ignore list", () => {
  const box = new Sandbox(__filename);

  let meshesIgnored: CliResult;
  let ltxIgnored: CliResult;

  beforeAll(() => {
    // --ignore replaces the default ignore list rather than adding to it, and it reaches the checks
    // that walk assets: ignoring the meshes directory leaves the check with nothing to inspect.
    meshesIgnored = box.run("verify-gamedata", [GAMEDATA, "--checks", "meshes", "--ignore", "meshes"]);

    // It does not reach the ltx check, which resolves configs through the ltx project rather than
    // through the asset walk, so the same findings survive being told to ignore the directory.
    ltxIgnored = box.run("verify-gamedata", [GAMEDATA, "--checks", "ltx", "--ignore", "configs"], { expectExit: 1 });
  });

  it("should leave the meshes check nothing to inspect when ignored", () => {
    expect(meshesIgnored).toMatchSnapshot();
  });

  it("should still report ltx findings for an ignored configs directory", () => {
    expect(ltxIgnored).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
