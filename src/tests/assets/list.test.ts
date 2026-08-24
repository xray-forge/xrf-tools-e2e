import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("assets list", () => {
  const box = new Sandbox(__filename);

  let listed: CliResult;
  let prefixed: CliResult;
  let loose: CliResult;

  beforeAll(() => {
    listed = box.run("assets list", ["--path", gamedata()]);
    prefixed = box.run("assets list", ["--path", gamedata(), "--prefix", "meshes"]);
    loose = box.run("assets list", ["--path", gamedata(), "--loose"]);
  });

  it("should resolve the whole tree", () => {
    expect(listed).toMatchSnapshot();
  });

  it("should limit a listing to one subtree", () => {
    expect(prefixed).toMatchSnapshot();
  });

  // The tree has no archives, so the loose listing must match the full one.
  it("should match the loose listing", () => {
    expect(loose.stdout).toEqual(listed.stdout);
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
