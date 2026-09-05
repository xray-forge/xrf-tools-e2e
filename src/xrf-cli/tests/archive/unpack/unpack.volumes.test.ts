import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const MAXIMUM_VOLUME_MEGABYTES = 2;

const RESTORED_FILES = [
  "configs/system.ltx",
  "configs/misc/inventory_icons.ltx",
  "particles.xr",
  "spawns/all.spawn",
  "textures/ui/ui_test_sheet.dds",
];

describe("archive unpack volumes", () => {
  const box = new Sandbox(__filename);

  let unpackedSet: CliResult;
  let unpackedFirst: CliResult;

  beforeAll(() => {
    box.run("archive pack", [
      "--path",
      gamedata(),
      "--dest",
      box.at("split"),
      "--name",
      "gamedata",
      "--max-size",
      String(MAXIMUM_VOLUME_MEGABYTES),
    ]);

    // Mounting the directory reads every volume; pointing at one volume reads only that volume,
    // because a volume is a standalone archive rather than a slice that knows about its siblings.
    unpackedSet = box.run("archive unpack", ["--path", box.at("split"), "--dest", box.at("from-set")]);
    unpackedFirst = box.run("archive unpack", ["--path", box.at("split/gamedata.db0"), "--dest", box.at("from-first")]);
  });

  it("should unpack a whole volume set", () => {
    expect(unpackedSet).toMatchSnapshot();
  });

  it("should unpack a single volume on its own", () => {
    expect(unpackedFirst).toMatchSnapshot();
  });

  // The point of splitting: nothing is lost across the volume boundary.
  it("should restore every file byte for byte from the set", () => {
    for (const name of RESTORED_FILES) {
      expect(box.sha(`from-set/gamedata/${name}`)).toBe(sha(gamedata(name)));
    }
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
