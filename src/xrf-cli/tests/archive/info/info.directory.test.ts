import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive info directory", () => {
  const box = new Sandbox(__filename);

  let result: CliResult;

  beforeAll(() => {
    box.copyIn(gamedata("configs"), "source/configs");
    box.run("archive pack", ["--path", box.at("source"), "--dest", box.at("archives/configs"), "--name", "configs"]);
    box.run("archive pack", [
      "--path",
      gamedata("configs/gameplay"),
      "--dest",
      box.at("archives/gameplay"),
      "--name",
      "gameplay",
    ]);

    result = box.run("archive info", ["--path", box.at("archives"), "--verbose"]);
  });

  it("should describe every volume below the directory root", () => {
    expect(result).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
