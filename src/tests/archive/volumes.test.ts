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

describe("archive volumes and packing options", () => {
  const box = new Sandbox(__filename);

  let split: CliResult;
  let unpackedSet: CliResult;
  let unpackedFirst: CliResult;
  let stored: CliResult;
  let skipped: CliResult;
  let kept: CliResult;
  let configured: CliResult;
  let serial: CliResult;

  beforeAll(() => {
    // The whole tree is a couple of megabytes, so a one megabyte cap spans three volumes and the
    // <name>.db0 / .db1 / .db2 naming appears, which a single-volume pack never shows.
    split = box.run("pack-archive", [
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
    unpackedSet = box.run("unpack-archive", ["--path", box.at("split"), "--dest", box.at("from-set")]);
    unpackedFirst = box.run("unpack-archive", ["--path", box.at("split/gamedata.db0"), "--dest", box.at("from-first")]);

    stored = box.run("pack-archive", [
      "--path",
      gamedata("configs"),
      "--dest",
      box.at("stored"),
      "--name",
      "cfg",
      "--xdb",
      "--store",
    ]);

    // readme.txt is on the built-in skip list of editor and source leftovers.
    const source = box.copyIn(gamedata("configs"), "source");

    box.write("source/readme.txt", "leftover\n");

    skipped = box.run("pack-archive", ["--path", source, "--dest", box.at("skipped"), "--name", "a"]);
    kept = box.run("pack-archive", ["--path", source, "--dest", box.at("kept"), "--name", "a", "--no-skip-list"]);

    // An xrCompress configuration narrows what is packed: this one drops xml by extension and the
    // misc directory by name, so the configs tree packs one file short of its full contents.
    const config = box.write(
      "compress.ltx",
      ["[options]", "exclude_exts = *.xml", "", "[exclude_folders]", "misc", ""].join("\n")
    );

    configured = box.run("pack-archive", [
      "--path",
      gamedata("configs"),
      "--dest",
      box.at("configured"),
      "--name",
      "cfg",
      "--ltx",
      config,
    ]);

    // Unpacking is parallel by default; forcing a single thread must not change what lands on disk.
    serial = box.run("unpack-archive", [
      "--path",
      box.at("configured/cfg.db"),
      "--dest",
      box.at("serial"),
      "--parallel",
      "1",
    ]);
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

  it("should store instead of compressing and write an xdb", () => {
    expect(stored).toMatchSnapshot();
  });

  it("should skip editor leftovers by default", () => {
    expect(skipped).toMatchSnapshot();
  });

  it("should keep them when the skip list is off", () => {
    expect(kept).toMatchSnapshot();
  });

  // Keeping one more file has to change the archive, which is what proves the flag did something
  // rather than being accepted and ignored.
  it("should produce a different archive with the skip list off", () => {
    expect(box.sha("kept/a.db")).not.toBe(box.sha("skipped/a.db"));
  });

  it("should honour an xrCompress configuration", () => {
    expect(configured).toMatchSnapshot();
  });

  it("should unpack on a single thread", () => {
    expect(serial).toMatchSnapshot();
  });

  // Thread count is a scheduling choice, so it must not reach the bytes.
  it("should restore the same bytes on one thread as on many", () => {
    expect(box.sha("serial/gamedata/system.ltx")).toBe(sha(gamedata("configs/system.ltx")));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
