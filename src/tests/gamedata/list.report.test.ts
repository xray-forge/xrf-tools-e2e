import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox } from "#/test/sandbox";

/**
 * What `gamedata list` reports to a machine.
 */
describe("gamedata list report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("gamedata list", ["--path", gamedata(), "--silent", "--report", box.at("listing.json")]);
    box.run("gamedata list", [
      "--path",
      gamedata(),
      "--prefix",
      "meshes",
      "--silent",
      "--report",
      box.at("meshes.json"),
    ]);
  });

  it("should report every asset the tree resolves", () => {
    expect(box.json("listing.json")).toMatchSnapshot();
  });

  it("should report only the subtree a prefix names", () => {
    expect(box.json("meshes.json")).toMatchSnapshot();
  });
});
