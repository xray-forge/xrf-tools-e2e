import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("particles.xr");

describe("particle repack and particle re-unpack", () => {
  const box = new Sandbox(__filename);

  let repack: CliResult;
  let unpack: CliResult;
  let reUnpack: CliResult;

  beforeAll(() => {
    repack = box.run("particle repack", [
      "--path",
      SOURCE,
      "--dest",
      box.at("repacked.xr"),
      "--report",
      box.at("repack.json"),
    ]);
    unpack = box.run("particle unpack", ["--path", SOURCE, "--dest", box.at("unpacked")]);
    reUnpack = box.run("particle re-unpack", [
      "--path",
      box.at("unpacked"),
      "--dest",
      box.at("re-unpacked"),
      "--report",
      box.at("re-unpack.json"),
    ]);
  });

  it("should repack a container in one step", () => {
    expect(repack).toMatchSnapshot();
    expect(box.json("repack.json")).toMatchSnapshot();
  });

  it("should re-unpack an unpacked directory", () => {
    expect(reUnpack).toMatchSnapshot();
    expect(box.json("re-unpack.json")).toMatchSnapshot();
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

  it("should unpack the source container", () => {
    expect(unpack).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["re-unpack.json", "repack.json"] })).toMatchSnapshot();
  });
});
