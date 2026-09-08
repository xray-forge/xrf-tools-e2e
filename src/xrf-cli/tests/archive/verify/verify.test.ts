import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive verify", () => {
  const box = new Sandbox(__filename);

  let result: CliResult;

  beforeAll(() => {
    box.run("archive pack", ["--path", gamedata("configs"), "--dest", box.at("packed"), "--name", "fixture"]);

    result = box.run("archive verify", ["--path", box.at("packed/fixture.db")]);
  });

  it("should read and validate every payload", () => {
    expect(result).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
