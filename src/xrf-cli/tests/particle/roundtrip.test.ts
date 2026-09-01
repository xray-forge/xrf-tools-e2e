import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

const SOURCE = gamedata("particles.xr");

describe("particles roundtrip", () => {
  const box = new Sandbox(__filename);

  let info: CliResult;
  let verify: CliResult;
  let unpack: CliResult;
  let verifyUnpacked: CliResult;
  let pack: CliResult;

  beforeAll(() => {
    info = box.run("particle info", ["--path", SOURCE]);
    verify = box.run("particle verify", ["--path", SOURCE]);

    // Unpacks to header, effects, and groups ltx files.
    unpack = box.run("particle unpack", ["--path", SOURCE, "--dest", box.at("unpacked")]);
    verifyUnpacked = box.run("particle verify", ["--path", box.at("unpacked"), "--unpacked"]);
    pack = box.run("particle pack", ["--path", box.at("unpacked"), "--dest", box.at("repacked.xr")]);

    box.run("particle unpack", ["--path", box.at("repacked.xr"), "--dest", box.at("unpacked-again")]);
  });

  it("should report effect and group counts", () => {
    expect(info).toMatchSnapshot();
  });

  it("should verify the packed container", () => {
    expect(verify).toMatchSnapshot();
  });

  it("should unpack to ltx files", () => {
    expect(unpack).toMatchSnapshot();
  });

  it("should verify the unpacked form", () => {
    expect(verifyUnpacked).toMatchSnapshot();
  });

  it("should pack back into a container", () => {
    expect(pack).toMatchSnapshot();
  });

  // The packer is deterministic but does not reproduce the vanilla container byte for byte. Stating
  // that here keeps it a known, reviewed fact: if the packer ever becomes byte exact, this fails.
  it("should not reproduce the source byte for byte", () => {
    expect(box.sha("repacked.xr")).not.toBe(sha(SOURCE));
  });

  // The property that actually matters: the bytes may differ, the data may not.
  it("should preserve every effect", () => {
    expect(box.sha("unpacked-again/effects.ltx")).toBe(box.sha("unpacked/effects.ltx"));
  });

  it("should preserve every group", () => {
    expect(box.sha("unpacked-again/groups.ltx")).toBe(box.sha("unpacked/groups.ltx"));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
