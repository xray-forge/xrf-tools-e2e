import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const GAMEDATA = gamedata();

describe("gamedata verify mesh output", () => {
  const box = new Sandbox(__filename);

  let meshes: CliResult;
  let meshesAgain: CliResult;
  let meshesThird: CliResult;

  beforeAll(() => {
    // This is distinct from execution-width parity: it pins repeatable mesh diagnostics at the command's ordinary
    // scheduler choice, where the verifier itself may fan work out across its assets.
    meshes = box.run("gamedata verify", [GAMEDATA, "--checks", "meshes"], { expectExit: 3 });
    meshesAgain = box.run("gamedata verify", [GAMEDATA, "--checks", "meshes"], { expectExit: 3 });
    meshesThird = box.run("gamedata verify", [GAMEDATA, "--checks", "meshes"], { expectExit: 3 });
  });

  it("should verify meshes", () => {
    expect(meshes).toMatchSnapshot();
  });

  // Byte for byte, not merely the same set: the check verifies through rayon, and each worker logs
  // into its listed position rather than as it finishes, so what the command prints is decided by
  // the tree and not by which mesh happened to be read first.
  it("should print an identical run every time", () => {
    expect(meshesAgain).toEqual(meshes);
    expect(meshesThird).toEqual(meshes);
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
