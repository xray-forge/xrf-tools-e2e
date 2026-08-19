import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

/**
 * A minimal installation, in the six-field form the engine reads:
 * `alias = recurs| notif| root| add`.
 *
 * Declarations are searched in reverse, so the one declared last wins. `$game_data$` becomes a
 * directory mount and any alias whose directory holds `.db` volumes becomes an archive mount, which
 * is what makes `database\` a second source without naming it as one.
 */
const FSGAME = [
  "$arch_dir$              = false| false| $fs_root$| database\\",
  "$game_data$             = true|  true|  $fs_root$| gamedata\\",
  "",
].join("\n");

describe("list-assets across mounts", () => {
  const box = new Sandbox(__filename);

  let listed: CliResult;
  let shadowed: CliResult;
  let loose: CliResult;

  beforeAll(() => {
    // The archive is packed from a staging tree shaped like a gamedata root, so its entries land on
    // the same logical paths the loose tree uses. Without that the two mounts would simply hold
    // different files and nothing would ever be hidden.
    box.copyIn(gamedata("configs/system.ltx"), "stage/configs/system.ltx");
    box.copyIn(gamedata("configs/fonts.ltx"), "stage/configs/fonts.ltx");
    box.run("pack-archive", ["--path", box.at("stage"), "--dest", box.at("install/database"), "--name", "gamedata"]);

    // Only system.ltx exists loose, so it wins over the archived copy while fonts.ltx can only come
    // from the archive.
    box.copyIn(gamedata("configs/system.ltx"), "install/gamedata/configs/system.ltx");
    box.write("install/fsgame.ltx", FSGAME);

    listed = box.run("list-assets", ["--path", box.at("install")]);
    shadowed = box.run("list-assets", ["--path", box.at("install"), "--shadowed"]);
    loose = box.run("list-assets", ["--path", box.at("install"), "--loose"]);
  });

  // Two mounts, and each asset reports which one answered for it.
  it("should resolve an installation across both mounts", () => {
    expect(listed).toMatchSnapshot();
  });

  // The default listing shows only the winner, so the archived copy of system.ltx is invisible
  // until asked for. That is the whole point of the flag: a file can be overridden without any
  // sign of it.
  it("should reveal the copy hidden by a higher-priority mount", () => {
    expect(shadowed).toMatchSnapshot();
  });

  it("should list only loose files when asked", () => {
    expect(loose).toMatchSnapshot();
  });

  it("should write nothing of its own", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
