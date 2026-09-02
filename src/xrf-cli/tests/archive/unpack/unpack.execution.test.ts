import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

describe("archive unpack execution width", () => {
  const box = new Sandbox(__filename);

  let serial: CliResult;

  beforeAll(() => {
    box.run("archive pack", ["--path", gamedata("configs"), "--dest", box.at("packed"), "--name", "cfg"]);

    // Unpacking is parallel by default; forcing a single worker must not change what lands on disk.
    serial = box.run("archive unpack", ["--path", box.at("packed/cfg.db"), "--dest", box.at("serial"), "-j", "1"]);
  });

  it("should unpack on a single worker", () => {
    expect(serial).toMatchSnapshot();
  });

  // The width is a scheduling choice, so it must not reach the bytes.
  it("should restore the same bytes on one worker as on many", () => {
    expect(box.sha("serial/gamedata/system.ltx")).toBe(sha(gamedata("configs/system.ltx")));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
