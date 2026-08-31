import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("archive list", () => {
  const box = new Sandbox(__filename);

  let files: CliResult;
  let directories: CliResult;

  beforeAll(() => {
    box.run("archive pack", ["--path", gamedata("configs"), "--dest", box.at("packed"), "--name", "fixture"]);

    files = box.run("archive list", ["--path", box.at("packed/fixture.db"), "--files"]);
    directories = box.run("archive list", ["--path", box.at("packed/fixture.db"), "--directories"]);
  });

  it("should list logical files", () => {
    expect(files).toMatchSnapshot();
  });

  it("should list directory records", () => {
    expect(directories).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
