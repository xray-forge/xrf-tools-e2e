import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

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
    verify = box.run("particle verify", ["--path", SOURCE, "--report", box.at("verify.json")]);

    // Unpacks to header, effects, and groups ltx files.
    unpack = box.run("particle unpack", [
      "--path",
      SOURCE,
      "--dest",
      box.at("unpacked"),
      "--report",
      box.at("unpack.json"),
    ]);
    verifyUnpacked = box.run("particle verify", [
      "--path",
      box.at("unpacked"),
      "--unpacked",
      "--report",
      box.at("verify-unpacked.json"),
    ]);
    pack = box.run("particle pack", [
      "--path",
      box.at("unpacked"),
      "--dest",
      box.at("repacked.xr"),
      "--report",
      box.at("pack.json"),
    ]);

    box.run("particle unpack", ["--path", box.at("repacked.xr"), "--dest", box.at("unpacked-again")]);
  });

  it("should report effect and group counts", () => {
    expect(info).toMatchSnapshot();
  });

  it("should verify the packed container", () => {
    expect(verify).toMatchSnapshot();
    expect(box.json("verify.json")).toMatchSnapshot();
  });

  it("should unpack to ltx files", () => {
    expect(unpack).toMatchSnapshot();
    expect(box.json("unpack.json")).toMatchSnapshot();
  });

  it("should verify the unpacked form", () => {
    expect(verifyUnpacked).toMatchSnapshot();
    expect(box.json("verify-unpacked.json")).toMatchSnapshot();
  });

  it("should pack back into a container", () => {
    expect(pack).toMatchSnapshot();
    expect(box.json("pack.json")).toMatchSnapshot();
  });

  // The packer writes chunks in the SDK's order, so a shipped library, sorted as the SDK saves it,
  // packs back to the same bytes.
  it("should reproduce the source byte for byte", () => {
    expect(box.sha("repacked.xr")).toBe(sha(SOURCE));
  });

  // Unpacking the repacked container has to give back the same data.
  it("should preserve every effect", () => {
    expect(box.sha("unpacked-again/effects.ltx")).toBe(box.sha("unpacked/effects.ltx"));
  });

  it("should preserve every group", () => {
    expect(box.sha("unpacked-again/groups.ltx")).toBe(box.sha("unpacked/groups.ltx"));
  });

  it("should write the expected files", () => {
    expect(
      box.manifest({ normalized: ["pack.json", "unpack.json", "verify-unpacked.json", "verify.json"] })
    ).toMatchSnapshot();
  });
});
