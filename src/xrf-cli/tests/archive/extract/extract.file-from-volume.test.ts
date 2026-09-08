import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive extract file from one volume", () => {
  const box = new Sandbox(__filename);

  let result: CliResult;

  beforeAll(() => {
    box.run("archive pack", ["--path", gamedata("configs"), "--dest", box.at("packed"), "--name", "fixture"]);

    result = box.run("archive extract", [
      "--path",
      box.at("packed/fixture.db"),
      "--file",
      "system.ltx",
      "--dest",
      box.at("system.ltx"),
    ]);
  });

  it("should extract the selected file byte for byte", () => {
    expect(result).toMatchSnapshot();
    expect(box.sha("system.ltx")).toBe(sha(gamedata("configs/system.ltx")));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
