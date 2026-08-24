import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

const RESTORED_FILES = [
  "configs/system.ltx",
  "configs/misc/inventory_icons.ltx",
  "particles.xr",
  "spawns/all.spawn",
  "textures/ui/ui_test_sheet.dds",
];

describe("archive volumes", () => {
  const box = new Sandbox(__filename);

  let split: CliResult;
  let unpackedSet: CliResult;
  let unpackedFirst: CliResult;

  beforeAll(() => {
    // The whole tree is a couple of megabytes, so a one megabyte cap spans three volumes and the
    // <name>.db0 / .db1 / .db2 naming appears, which a single-volume pack never shows.
    split = box.run("archive pack", [
      "--path",
      gamedata(),
      "--dest",
      box.at("split"),
      "--name",
      "gamedata",
      "--max-size",
      "1",
    ]);

    // Mounting the directory reads every volume; pointing at one volume reads only that volume,
    // because a volume is a standalone archive rather than a slice that knows about its siblings.
    unpackedSet = box.run("archive unpack", ["--path", box.at("split"), "--dest", box.at("from-set")]);
    unpackedFirst = box.run("archive unpack", ["--path", box.at("split/gamedata.db0"), "--dest", box.at("from-first")]);
  });

  it("should split a pack across volumes", () => {
    expect(split).toMatchSnapshot();
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
