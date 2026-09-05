import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("meshes/omf/wpn_svd_hud_animation.omf");

describe("omf repack roundtrip", () => {
  const box = new Sandbox(__filename);

  let verify: CliResult;
  let repack: CliResult;
  let info: CliResult;

  beforeAll(() => {
    // Verify mode reads, rebuilds, and compares in memory without writing anything.
    verify = box.run("omf repack", ["--path", SOURCE, "--verify"]);
    repack = box.run("omf repack", [
      "--path",
      SOURCE,
      "--dest",
      box.at("repacked.omf"),
      "--report",
      box.at("repack.json"),
    ]);
    info = box.run("omf info", ["--path", box.at("repacked.omf")]);
  });

  it("should verify in place", () => {
    expect(verify).toMatchSnapshot();
  });

  it("should write a repacked container", () => {
    expect(repack).toMatchSnapshot();
  });

  it("should report a repack", () => {
    expect(box.json("repack.json")).toMatchSnapshot();
  });

  it("should reproduce the source byte for byte", () => {
    expect(box.sha("repacked.omf")).toBe(sha(SOURCE));
  });

  it("should still read back after repacking", () => {
    expect(info).toMatchSnapshot();
  });

  it("should write only the repacked container and report", () => {
    expect(box.manifest({ normalized: ["repack.json"] })).toMatchSnapshot();
  });
});
