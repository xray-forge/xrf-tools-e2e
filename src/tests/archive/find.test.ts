import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("archive find", () => {
  const box = new Sandbox(__filename);

  let result: CliResult;

  beforeAll(() => {
    // Preserve configs as part of the archive's logical namespace instead of treating it as the source root.
    box.copyIn(gamedata("configs"), "source/configs");

    box.run("archive pack", ["--path", box.at("source"), "--dest", box.at("packed"), "--name", "fixture"]);

    result = box.run("archive find", ["--path", box.at("packed/fixture.db"), "--query", "system", "--files"]);
  });

  it("should find a full logical path case-insensitively with its unpacked size", () => {
    expect(result).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
