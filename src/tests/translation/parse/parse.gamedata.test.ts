import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("translation parse reads a gamedata tree", () => {
  const box = new Sandbox(__filename);

  let imported: CliResult;

  beforeAll(() => {
    // The shared gamedata fixture, whose string tables sit where a shipped game keeps them, so the
    // run has to resolve `configs\text` and then the language directory to find anything.
    imported = box.run("translation parse", [
      "--path",
      gamedata(),
      "--source",
      "directory",
      "--language",
      "ukr",
      "--output",
      box.at("sources"),
    ]);
  });

  it("should import from a gamedata root", () => {
    expect(imported).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
