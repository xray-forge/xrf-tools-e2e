import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

describe("archive extract file from archive directory", () => {
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
      "--file",
      "configs\\system.ltx",
      "--dest",
      box.at("extracted/system.ltx"),
    ]);
  });

  it("should extract a file from an archive below the directory root", () => {
    expect(result).toMatchSnapshot();
    expect(box.sha("extracted/system.ltx")).toBe(sha(gamedata("configs/system.ltx")));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
