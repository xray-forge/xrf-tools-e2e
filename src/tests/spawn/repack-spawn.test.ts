import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

const ALL_SPAWN = gamedata("spawns/all.spawn");

describe("repack-spawn", () => {
  const box = new Sandbox(__filename);

  let repack: CliResult;
  let again: CliResult;

  beforeAll(() => {
    // Repacking is the unpack and pack pair done in memory, so it has to land on the same bytes as
    // doing both by hand does.
    repack = box.run("repack-spawn", ["--path", ALL_SPAWN, "--dest", box.at("repacked.spawn")]);
    again = box.run("repack-spawn", ["--path", box.at("repacked.spawn"), "--dest", box.at("twice.spawn")]);
  });

  it("should repack in one step", () => {
    expect(repack).toMatchSnapshot();
  });

  it("should reproduce the source byte for byte", () => {
    expect(box.sha("repacked.spawn")).toBe(sha(ALL_SPAWN));
  });

  // Repacking an already repacked file must change nothing, or the operation is not a fixed point
  // and every pass through a build pipeline would churn the file.
  it("should be idempotent", () => {
    expect(box.sha("twice.spawn")).toBe(box.sha("repacked.spawn"));
  });

  it("should report the second pass the same way", () => {
    expect(again).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
