import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

const SOURCE = gamedata("meshes/omf/wpn_svd_hud_animation.omf");

describe("repack-omf roundtrip", () => {
  const box = new Sandbox(__filename);

  let verify: CliResult;
  let repack: CliResult;
  let info: CliResult;

  beforeAll(() => {
    // Verify mode reads, rebuilds, and compares in memory without writing anything.
    verify = box.run("repack-omf", ["--path", SOURCE, "--verify"]);
    repack = box.run("repack-omf", ["--path", SOURCE, "--dest", box.at("repacked.omf")]);
    info = box.run("info-omf", ["--path", box.at("repacked.omf")]);
  });

  it("should verify in place", () => {
    expect(verify).toMatchSnapshot();
  });

  it("should write a repacked container", () => {
    expect(repack).toMatchSnapshot();
  });

  it("should reproduce the source byte for byte", () => {
    expect(box.sha("repacked.omf")).toBe(sha(SOURCE));
  });

  it("should still read back after repacking", () => {
    expect(info).toMatchSnapshot();
  });

  it("should write only the repacked container", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
