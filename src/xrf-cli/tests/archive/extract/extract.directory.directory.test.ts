import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive extract directory from archive directory", () => {
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

    result = box.run("archive extract", [
      "--path",
      box.at("archives"),
      "--directory",
      "configs\\gameplay",
      "--dest",
      box.at("extracted"),
    ]);
  });

  it("should extract a directory from an archive below the directory root", () => {
    expect(result).toMatchSnapshot();
    expect(box.sha("extracted/dialogs.xml")).toBe(sha(gamedata("configs/gameplay/dialogs.xml")));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
