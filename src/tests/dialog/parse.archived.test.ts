import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

/**
 * The six-field installation form the engine reads, as `gamedata list` stages it: `$game_data$`
 * becomes a directory mount and an alias whose directory holds `.db` volumes becomes an archive
 * mount.
 */
const FSGAME = [
  "$arch_dir$              = false| false| $fs_root$| database\\",
  "$game_data$             = true|  true|  $fs_root$| gamedata\\",
  "",
].join("\n");

/**
 * On a shipped game the dialogs come out of `db\configs`, so a sweep reaching for the filesystem
 * would report a full installation as empty. Splitting the two committed files across an archive
 * and a loose tree is what shows the sweep reads through the VFS rather than walking directories.
 */
describe("dialog parse over an installation", () => {
  const box = new Sandbox(__filename);

  let installation: CliResult;
  let loose: CliResult;

  beforeAll(() => {
    // Packed from a staging tree shaped like a gamedata root, so the entry lands on the logical
    // path the loose copy would have used.
    box.copyIn(gamedata("configs/gameplay/dialogs.xml"), "stage/configs/gameplay/dialogs.xml");
    box.run("archive pack", ["--path", box.at("stage"), "--dest", box.at("install/database"), "--name", "gamedata"]);

    box.copyIn(gamedata("configs/gameplay/dialogs_zaton.xml"), "install/gamedata/configs/gameplay/dialogs_zaton.xml");
    box.write("install/fsgame.ltx", FSGAME);

    installation = box.run("dialog parse", ["--path", box.at("install"), "--verbose"]);
    loose = box.run("dialog parse", ["--path", gamedata(), "--verbose"]);
  });

  it("should sweep an installation across both mounts", () => {
    expect(installation).toMatchSnapshot();
  });

  // The archived file is read like any other, so everything past the origin and the file tally is
  // identical to sweeping the same two files loose. That comparison is the assertion here: a
  // snapshot alone would not say the archive changed nothing but where the bytes came from.
  it("should read an archived dialog exactly as a loose one", () => {
    expect(installation.stdout.slice(2)).toEqual(loose.stdout.slice(2));
    expect(installation.stdout[1]).toContain("1 archived");
    expect(loose.stdout[1]).toContain("0 archived");
  });

  it("should write only the archive it packed", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
