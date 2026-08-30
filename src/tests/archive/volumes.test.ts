import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult, type ManifestFile } from "#/test/sandbox";

/**
 * Smallest cap the corpus can be packed under, in megabytes.
 */
const MAXIMUM_VOLUME_MEGABYTES = 2;
const MAXIMUM_VOLUME_BYTES = MAXIMUM_VOLUME_MEGABYTES * 1024 * 1024;

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
  let refused: CliResult;
  let unpackedSet: CliResult;
  let unpackedFirst: CliResult;

  beforeAll(() => {
    // Two volumes, so the <name>.db0 / .db1 naming appears at all - a pack that fits one volume writes a bare
    // <name>.db with no index.
    split = box.run("archive pack", [
      "--path",
      gamedata(),
      "--dest",
      box.at("split"),
      "--name",
      "gamedata",
      "--max-size",
      String(MAXIMUM_VOLUME_MEGABYTES),
    ]);

    // The same corpus under a cap one of its files cannot fit, so a volume past the advertised cap is refused rather
    // than published. The refusal is not atomic: the manifest below records the partial volumes it leaves in the
    // destination, which is the residue a failed pack is known to leave and is recorded here rather than hidden.
    refused = box.run(
      "archive pack",
      ["--path", gamedata(), "--dest", box.at("refused"), "--name", "gamedata", "--max-size", "1"],
      { expectExit: 1 }
    );

    // Mounting the directory reads every volume; pointing at one volume reads only that volume,
    // because a volume is a standalone archive rather than a slice that knows about its siblings.
    unpackedSet = box.run("archive unpack", ["--path", box.at("split"), "--dest", box.at("from-set")]);
    unpackedFirst = box.run("archive unpack", ["--path", box.at("split/gamedata.db0"), "--dest", box.at("from-first")]);
  });

  it("should split a pack across volumes", () => {
    expect(split).toMatchSnapshot();
  });

  // The cap is a limit on what is written, not a target the writer may exceed to place one large file.
  it("should keep every written volume inside the cap", () => {
    const volumes: Array<ManifestFile> = box.manifest().filter((file) => file.path.startsWith("split/"));

    expect(volumes.length).toBeGreaterThan(1);

    for (const volume of volumes) {
      expect(volume.size).toBeLessThanOrEqual(MAXIMUM_VOLUME_BYTES);
    }
  });

  it("should refuse a cap no volume could fit one of the files under", () => {
    expect(refused).toMatchSnapshot();
    expect(refused.stderr.join("\n")).toContain("particles.xr");
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
