import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

const SOURCE = gamedata("particles.xr");

describe("repack-particles and re-unpack-particles", () => {
  const box = new Sandbox(__filename);

  let repack: CliResult;
  let unpack: CliResult;
  let reUnpack: CliResult;

  beforeAll(() => {
    repack = box.run("repack-particles", ["--path", SOURCE, "--dest", box.at("repacked.xr")]);
    unpack = box.run("unpack-particles", ["--path", SOURCE, "--dest", box.at("unpacked")]);
    reUnpack = box.run("re-unpack-particles", ["--path", box.at("unpacked"), "--dest", box.at("re-unpacked")]);
  });

  it("should repack a container in one step", () => {
    expect(repack).toMatchSnapshot();
  });

  it("should re-unpack an unpacked directory", () => {
    expect(reUnpack).toMatchSnapshot();
  });

  // Same as the roundtrip test states: the packer is deterministic but does not reproduce the
  // vanilla container byte for byte, so a one-step repack cannot either.
  it("should not reproduce the source byte for byte", () => {
    expect(box.sha("repacked.xr")).not.toBe(sha(SOURCE));
  });

  // Re-unpacking rewrites the unpacked form through the same reader and writer, so the data has to
  // survive it untouched.
  it("should preserve every effect through a re-unpack", () => {
    expect(box.sha("re-unpacked/effects.ltx")).toBe(box.sha("unpacked/effects.ltx"));
  });

  it("should preserve every group through a re-unpack", () => {
    expect(box.sha("re-unpacked/groups.ltx")).toBe(box.sha("unpacked/groups.ltx"));
  });

  it("should agree with unpacking the repacked container", () => {
    expect(unpack).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
