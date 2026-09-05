import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive extract directory from one volume", () => {
  const box = new Sandbox(__filename);

  let result: CliResult;

  beforeAll(() => {
    box.run("archive pack", ["--path", gamedata("configs"), "--dest", box.at("packed"), "--name", "fixture"]);

    result = box.run("archive extract", [
      "--path",
      box.at("packed/fixture.db"),
      "--directory",
      "gameplay",
      "--dest",
      box.at("gameplay"),
    ]);
  });

  it("should extract the selected directory without its prefix", () => {
    expect(result).toMatchSnapshot();
    expect(box.sha("gameplay/dialogs.xml")).toBe(sha(gamedata("configs/gameplay/dialogs.xml")));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
