import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive workflow", () => {
  const box = new Sandbox(__filename);

  let pack: CliResult;
  let info: CliResult;
  let verify: CliResult;
  let list: CliResult;
  let find: CliResult;
  let extract: CliResult;

  beforeAll(() => {
    box.copyIn(gamedata("configs"), "source/configs");

    const archive = box.at("packed");

    pack = box.run("archive pack", ["--path", box.at("source"), "--dest", archive, "--name", "fixture"]);
    info = box.run("archive info", ["--path", archive]);
    verify = box.run("archive verify", ["--path", archive]);
    list = box.run("archive list", ["--path", archive, "--files"]);
    find = box.run("archive find", ["--path", archive, "--query", "system", "--files"]);
    extract = box.run("archive extract", [
      "--path",
      archive,
      "--file",
      "configs\\system.ltx",
      "--dest",
      box.at("extracted/system.ltx"),
    ]);
  });

  it("should pack the source tree", () => {
    expect(pack).toMatchSnapshot();
  });

  it("should describe and verify the packed archive", () => {
    expect(info).toMatchSnapshot();
    expect(verify).toMatchSnapshot();
  });

  it("should list and find its logical files", () => {
    expect(list).toMatchSnapshot();
    expect(find).toMatchSnapshot();
  });

  it("should extract the selected source file byte for byte", () => {
    expect(extract).toMatchSnapshot();
    expect(box.sha("extracted/system.ltx")).toBe(sha(box.at("source/configs/system.ltx")));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
