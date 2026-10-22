import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive extract directory through a linked directory", () => {
  const box = new Sandbox(__filename);

  let followed: CliResult;
  let refused: CliResult;

  beforeAll(() => {
    box.run("archive pack", [gamedata("configs"), "--dest", box.at("packed"), "--name", "cfg"]);

    // A junction needs no privilege on Windows; elsewhere the type is ignored and this is a symlink.
    for (const name of ["followed", "refused"]) {
      fs.mkdirSync(box.at(`${name}/linked`), { recursive: true });
      fs.mkdirSync(box.at(`${name}/out`), { recursive: true });
      fs.symlinkSync(box.at(`${name}/linked`), box.at(`${name}/out/eng`), "junction");
    }

    followed = box.run("archive extract", [
      "--path",
      box.at("packed/cfg.db"),
      "--directory",
      "text",
      "--dest",
      box.at("followed/out"),
    ]);
    refused = box.run(
      "archive extract",
      ["--path", box.at("packed/cfg.db"), "--directory", "text", "--dest", box.at("refused/out"), "--refuse-links"],
      { expectExit: 1 }
    );
  });

  it("should extract through the link by default", () => {
    expect(followed.exitCode).toBe(0);
    expect(box.sha("followed/linked/st_items.xml")).toBe(sha(gamedata("configs/text/eng/st_items.xml")));
  });

  it("should refuse the link when asked to, and write nothing through it", () => {
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr.join("\n")).toContain("it is a link, and this run refuses links below its destination");
    expect(fs.readdirSync(box.at("refused/linked"))).toEqual([]);
  });
});
