import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sortedFindings, type CliResult } from "#/test/sandbox";

describe("verify-gamedata meets a damaged tree", () => {
  const box = new Sandbox(__filename);

  let swept: CliResult;

  beforeAll(() => {
    // A whole tree with one damaged visual in it, which is the case a modder actually hits: the
    // sweep has to say which asset is broken without giving up on the rest. The tree is copied so
    // the damage never touches the corpus.
    const root = box.copyIn(gamedata(), "gamedata");

    fs.writeFileSync(
      box.at("gamedata/meshes/ogf/part_none.ogf"),
      fs.readFileSync(gamedata("meshes/ogf/part_none.ogf")).subarray(0, 200)
    );

    swept = box.run("verify-gamedata", [root, "--checks", "meshes"], { expectExit: 3 });
  });

  // Names the broken asset with the reason, and still reports on the visuals around it.
  it("should name a damaged asset and finish the sweep", () => {
    expect(sortedFindings(swept)).toMatchSnapshot();
  });

  // The copied tree is what the manifest records; the point is that verifying added nothing to it.
  it("should write nothing of its own", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
