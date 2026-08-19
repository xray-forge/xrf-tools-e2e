import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

const PACKED_FILES = ["alife.ltx", "defines.ltx", "evaluation.ltx", "fonts.ltx", "game.ltx", "system.ltx"];

describe("archive roundtrip", () => {
  const box = new Sandbox(__filename);

  let pack: CliResult;
  let unpack: CliResult;
  let dry: CliResult;

  beforeAll(() => {
    const source = box.copyIn(gamedata("configs"), "source");

    // A single volume is written as testdata.db rather than testdata.db0.
    pack = box.run("pack-archive", ["--path", source, "--dest", box.at("packed"), "--name", "testdata"]);
    unpack = box.run("unpack-archive", ["--path", box.at("packed/testdata.db"), "--dest", box.at("unpacked")]);
    dry = box.run("unpack-archive", ["--path", box.at("packed/testdata.db"), "--dest", box.at("dry"), "--dry"]);
  });

  it("should pack a directory into a volume", () => {
    expect(pack).toMatchSnapshot();
  });

  it("should unpack the volume", () => {
    expect(unpack).toMatchSnapshot();
  });

  // Archived entries keep the gamedata prefix the engine mounts them under, so the unpacked tree is
  // one level deeper than the source.
  it("should restore every file byte for byte", () => {
    for (const name of PACKED_FILES) {
      expect(box.sha(`unpacked/gamedata/${name}`)).toBe(sha(gamedata(`configs/${name}`)));
    }
  });

  it("should report without writing in dry mode", () => {
    expect(dry).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
