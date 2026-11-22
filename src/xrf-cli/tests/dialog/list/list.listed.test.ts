import { beforeAll, describe, expect, it } from "@jest/globals";

import { dialogPartners } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What `dialog list` reads from a tree whose `system.ltx` lists its dialog and partner files.
 *
 * @remarks
 * The engine loads only the files `system.ltx` lists. This copy of `dialog-partners` lists every file but
 * `dialogs_overlay.xml`, so `actor_break_dialog` is declared once, and `character_desc_zaton.xml`, so the `snag` profile
 * pins a character nothing the engine loads declares.
 */
describe("dialog list over system.ltx lists", () => {
  const box = new Sandbox(__filename);

  let tree: string;
  let listed: CliResult;

  beforeAll(() => {
    tree = box.copyIn(dialogPartners(), "tree");

    box.write(
      "tree/configs/system.ltx",
      [
        "[dialogs]",
        "files = dialogs",
        "",
        "[profiles]",
        "files = npc_profile",
        "specific_characters_files = character_desc_general",
        "",
        "[info_portions]",
        "files = info_portions",
        "",
      ].join("\n")
    );

    listed = box.run("dialog list", [tree, "--source", "directory"]);
  });

  it("should list only the dialogs of the listed files", () => {
    expect(listed).toMatchSnapshot();
    expect(listed.stdout.filter((line: string) => line.startsWith("actor_break_dialog "))).toHaveLength(1);
  });

  it("should refuse a profile whose character only an unlisted file declares", () => {
    expect(
      box.run("dialog list", [tree, "--source", "directory", "--profile", "snag"], { expectExit: 1 })
    ).toMatchSnapshot();
  });

  it("should still offer the dialogs of a character a listed file declares", () => {
    expect(box.run("dialog list", [tree, "--source", "directory", "--profile", "novice"])).toMatchSnapshot();
  });
});
