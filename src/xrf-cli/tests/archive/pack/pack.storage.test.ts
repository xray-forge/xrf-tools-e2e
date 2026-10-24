import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack storage", () => {
  const box = new Sandbox(__filename);

  let stored: CliResult;

  beforeAll(() => {
    stored = box.run("archive pack", [
      "--path",
      gamedata("configs"),
      "--dest",
      box.at("stored"),
      "--name",
      "cfg",
      "--xdb",
      "--store",
    ]);
  });

  it("should store instead of compressing and write an xdb", () => {
    expect(stored).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
