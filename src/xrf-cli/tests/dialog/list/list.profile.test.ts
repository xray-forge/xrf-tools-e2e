import { beforeAll, describe, expect, it } from "@jest/globals";

import { dialogPartners } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const TREE = dialogPartners();

/**
 * What `dialog list --profile` says reaches the actor from an NPC of one profile.
 *
 * @remarks
 * `dialog-partners` is shaped for the engine's rules. `snag` declares its own start dialog above an include that
 * declares `hello_dialog` too, so the first declaration has to win, and offers `snag_missing_dialog`, which no file
 * declares. The `novice` characters sit in a rootless part that `character_desc_general.xml` includes, as Anomaly writes
 * them, beside `story_novice`, whose `no_random` keeps a profile naming only the class from picking it.
 * `global_dialogs` offers `actor_break_dialog` to everyone.
 */
describe("dialog list --profile", () => {
  const box = new Sandbox(__filename);

  let snag: CliResult;
  let pinned: CliResult;
  let novice: CliResult;
  let verbose: CliResult;

  beforeAll(() => {
    snag = box.run("dialog list", ["--path", TREE, "--source", "directory", "--profile", "snag"]);
    pinned = box.run("dialog list", ["--path", TREE, "--source", "directory", "--profile", "snag_pinned"]);
    novice = box.run("dialog list", ["--path", TREE, "--source", "directory", "--profile", "novice"]);
    verbose = box.run("dialog list", ["--path", TREE, "--source", "directory", "--profile", "snag", "--verbose"]);

    box.run("dialog list", [
      "--path",
      TREE,
      "--source",
      "directory",
      "--profile",
      "snag",
      "--silent",
      "--report",
      box.at("report.json"),
    ]);
  });

  it("should list the start dialog, the actor dialogs and the info portion dialogs, in that order", () => {
    expect(snag).toMatchSnapshot();
  });

  // The include declares `hello_dialog` after Snag's own start dialog, and the engine reads the first declaration.
  it("should keep the character's own start dialog over the one its include declares", () => {
    expect(
      snag.stdout.some((line: string) => line.startsWith("snag_cache_dialog ") && line.includes("start of snag"))
    ).toBe(true);
    expect(snag.stdout.some((line: string) => line.startsWith("hello_dialog "))).toBe(false);
  });

  it("should offer the same dialogs through a profile that pins the character", () => {
    expect(pinned.stdout.slice(0, -1)).toEqual(snag.stdout.slice(0, -1));
  });

  it("should resolve a class to every character it may pick, read through the file including them", () => {
    expect(novice).toMatchSnapshot();
  });

  it("should name an offered dialog no file declares under verbose output", () => {
    expect(verbose).toMatchSnapshot();
  });

  it("should report the profile, the characters it resolves to and each way a dialog is offered", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should refuse a profile the tree does not declare", () => {
    expect(
      box.run("dialog list", ["--path", TREE, "--source", "directory", "--profile", "stranger"], { expectExit: 1 })
    ).toMatchSnapshot();
  });

  it("should refuse a profile whose class no character carries", () => {
    expect(
      box.run("dialog list", ["--path", TREE, "--source", "directory", "--profile", "nobody"], { expectExit: 1 })
    ).toMatchSnapshot();
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
