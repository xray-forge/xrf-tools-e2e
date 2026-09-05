import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

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

describe("gamedata list across mounts", () => {
  const box = new Sandbox(__filename);

  let listed: CliResult;
  let shadowed: CliResult;
  let loose: CliResult;
  let before: Array<string>;

  beforeAll(() => {
    // The archive is packed from a staging tree shaped like a gamedata root, so its entries land on
    // the same logical paths the loose tree uses. Without that the two mounts would simply hold
    // different files and nothing would ever be hidden.
    box.copyIn(gamedata("configs/system.ltx"), "stage/configs/system.ltx");
    box.copyIn(gamedata("configs/fonts.ltx"), "stage/configs/fonts.ltx");
    box.run("archive pack", ["--path", box.at("stage"), "--dest", box.at("install/database"), "--name", "gamedata"]);

    // Only system.ltx exists loose, so it wins over the archived copy while fonts.ltx can only come
    // from the archive.
    box.copyIn(gamedata("configs/system.ltx"), "install/gamedata/configs/system.ltx");
    box.write("install/fsgame.ltx", FSGAME);

    const inputs = [
      "stage/configs/fonts.ltx",
      "stage/configs/system.ltx",
      "install/gamedata/configs/system.ltx",
      "install/fsgame.ltx",
      "install/database/gamedata.db",
    ];

    before = inputs.map((input) => box.sha(input));

    listed = box.run("gamedata list", ["--path", box.at("install"), "--report", box.at("listing.json")]);
    shadowed = box.run("gamedata list", [
      "--path",
      box.at("install"),
      "--shadowed",
      "--report",
      box.at("shadowed.json"),
    ]);
    loose = box.run("gamedata list", ["--path", box.at("install"), "--loose", "--report", box.at("loose.json")]);
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

  it("should report ordered winners, shadowed archive entries and loose-only entries", () => {
    const install = "<sandbox>/install";
    const archive = "<sandbox>/install/database";
    const looseRoot = "<sandbox>/install/gamedata";

    expect(box.json("listing.json")).toMatchObject({
      result: {
        origin: install,
        total: 2,
        entries: [
          { container: archive, isArchived: true, logicalPath: "configs\\fonts.ltx" },
          { container: looseRoot, isArchived: false, logicalPath: "configs\\system.ltx" },
        ],
        shadowed: [],
      },
    });
    expect(box.json("shadowed.json")).toMatchObject({
      result: {
        origin: install,
        isShadowedIncluded: true,
        total: 2,
        entries: [
          { container: archive, isArchived: true, logicalPath: "configs\\fonts.ltx" },
          { container: looseRoot, isArchived: false, logicalPath: "configs\\system.ltx" },
        ],
        shadowed: [{ container: archive, isArchived: true, logicalPath: "configs\\system.ltx" }],
      },
    });
    expect(box.json("loose.json")).toMatchObject({
      result: {
        origin: install,
        total: 1,
        entries: [{ container: looseRoot, isArchived: false, logicalPath: "configs\\system.ltx" }],
        shadowed: [],
      },
    });
  });

  it("should record each source mode", () => {
    expect(box.json("listing.json")).toMatchSnapshot();
    expect(box.json("shadowed.json")).toMatchSnapshot();
    expect(box.json("loose.json")).toMatchSnapshot();
  });

  it("should leave source inputs unchanged", () => {
    expect([
      box.sha("stage/configs/fonts.ltx"),
      box.sha("stage/configs/system.ltx"),
      box.sha("install/gamedata/configs/system.ltx"),
      box.sha("install/fsgame.ltx"),
      box.sha("install/database/gamedata.db"),
    ]).toEqual(before);
  });

  it("should write only its reports", () => {
    expect(box.manifest({ normalized: ["listing.json", "shadowed.json", "loose.json"] })).toMatchSnapshot();
  });
});
