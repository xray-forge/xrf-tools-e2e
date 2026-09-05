import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const ALL_SPAWN = gamedata("spawns/all.spawn");

describe("spawn roundtrip", () => {
  const box = new Sandbox(__filename);

  let info: CliResult;
  let verify: CliResult;
  let unpack: CliResult;
  let pack: CliResult;

  beforeAll(() => {
    info = box.run("spawn info", ["--path", ALL_SPAWN]);
    verify = box.run("spawn verify", ["--path", ALL_SPAWN, "--report", box.at("verify.json")]);

    // Produces twelve files: alife and artefact spawns, patrols, and the level graphs.
    unpack = box.run("spawn unpack", [
      "--path",
      ALL_SPAWN,
      "--dest",
      box.at("unpacked"),
      "--report",
      box.at("unpack.json"),
    ]);
    pack = box.run("spawn pack", [
      "--path",
      box.at("unpacked"),
      "--dest",
      box.at("repacked.spawn"),
      "--report",
      box.at("pack.json"),
    ]);

    // The repacked file is deliberately not verified again. The test below proves it is byte
    // identical to the source, which was already verified, so a second pass would spend two
    // seconds re-reading bytes that are known to be the same ones.
  });

  it("should report object, patrol, and graph counts", () => {
    expect(info).toMatchSnapshot();
  });

  it("should verify the source", () => {
    expect(verify).toMatchSnapshot();
  });

  it("should report the source verdict", () => {
    expect(box.json("verify.json")).toMatchSnapshot();
  });

  it("should unpack the whole game spawn", () => {
    expect(unpack).toMatchSnapshot();
  });

  it("should report what unpacking read and wrote", () => {
    expect(box.json("unpack.json")).toMatchSnapshot();
  });

  it("should pack it back", () => {
    expect(pack).toMatchSnapshot();
  });

  it("should report what packing read and wrote", () => {
    expect(box.json("pack.json")).toMatchSnapshot();
  });

  // The strongest assertion in the suite: a full unpack and repack of the real game spawn returns
  // the original bytes exactly.
  it("should reproduce the source byte for byte", () => {
    expect(box.sha("repacked.spawn")).toBe(sha(ALL_SPAWN));
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["pack.json", "unpack.json", "verify.json"] })).toMatchSnapshot();
  });
});
