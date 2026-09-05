import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("gamedata list selection", () => {
  const box = new Sandbox(__filename);

  let prefixed: CliResult;

  beforeAll(() => {
    prefixed = box.run("gamedata list", ["--path", gamedata(), "--prefix", "meshes"]);
  });

  it("should limit a listing to one subtree", () => {
    expect(prefixed).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
