import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("gamedata list sources", () => {
  const box = new Sandbox(__filename);

  let listed: CliResult;
  let loose: CliResult;

  beforeAll(() => {
    listed = box.run("gamedata list", ["--path", gamedata()]);
    loose = box.run("gamedata list", ["--path", gamedata(), "--loose"]);
    box.run("gamedata list", ["--path", gamedata(), "--silent", "--report", box.at("listing.json")]);
  });

  it("should resolve the whole tree", () => {
    expect(listed).toMatchSnapshot();
  });

  // The tree has no archives, so the loose listing must match the full one.
  it("should match the loose listing", () => {
    expect(loose.stdout).toEqual(listed.stdout);
  });

  it("should report every asset the tree resolves", () => {
    expect(box.json("listing.json")).toMatchSnapshot();
  });

  it("should write only its report", () => {
    expect(box.manifest({ normalized: ["listing.json"] })).toMatchSnapshot();
  });
});
