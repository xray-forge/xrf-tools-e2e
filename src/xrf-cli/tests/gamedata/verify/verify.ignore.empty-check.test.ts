import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const GAMEDATA = gamedata();

describe("gamedata verify ignored check input", () => {
  const box = new Sandbox(__filename);

  let ltx: CliResult;
  let meshes: CliResult;

  beforeAll(() => {
    // Project identity is decided before inspection filters apply. Ignoring configs empties the LTX check.
    ltx = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "--ignore", "configs"]);
    // The flag doing its job: a non-essential subtree is filtered out and the check finds nothing.
    meshes = box.run("gamedata verify", [GAMEDATA, "--checks", "meshes", "--ignore", "meshes"]);
  });

  it("should empty the LTX check when the configs directory is ignored", () => {
    expect(ltx).toMatchSnapshot();
  });

  it("should empty a check whose subtree is ignored", () => {
    expect(meshes).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
