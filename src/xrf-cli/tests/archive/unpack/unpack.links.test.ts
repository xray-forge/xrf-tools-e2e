import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive unpack through a linked directory", () => {
  const box = new Sandbox(__filename);

  let followed: CliResult;
  let refused: CliResult;

  beforeAll(() => {
    box.run("archive pack", [gamedata("configs"), "--dest", box.at("packed"), "--name", "cfg"]);

    // A junctioned or symlink-deployed folder is the user's layout, as a mod manager leaves it. A junction needs no
    // privilege on Windows; elsewhere the type is ignored and this is a symlink.
    for (const name of ["followed", "refused"]) {
      fs.mkdirSync(box.at(`${name}/linked`), { recursive: true });
      fs.mkdirSync(box.at(`${name}/out`), { recursive: true });
      fs.symlinkSync(box.at(`${name}/linked`), box.at(`${name}/out/gamedata`), "junction");
    }

    followed = box.run("archive unpack", ["--path", box.at("packed/cfg.db"), "--dest", box.at("followed/out")]);
    refused = box.run(
      "archive unpack",
      ["--path", box.at("packed/cfg.db"), "--dest", box.at("refused/out"), "--refuse-links"],
      { expectExit: 1 }
    );
  });

  it("should unpack through the link by default", () => {
    expect(followed).toMatchSnapshot();
  });

  it("should land the files where the link points", () => {
    expect(box.sha("followed/linked/system.ltx")).toBe(sha(gamedata("configs/system.ltx")));
  });

  it("should refuse the link when asked to", () => {
    expect(refused).toMatchSnapshot();
  });

  it("should write nothing through a refused link", () => {
    expect(fs.readdirSync(box.at("refused/linked"))).toEqual([]);
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
