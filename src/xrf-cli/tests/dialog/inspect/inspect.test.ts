import { beforeAll, describe, expect, it } from "@jest/globals";

import { dialogPartners } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const TREE = dialogPartners();

/**
 * What `dialog inspect` says about one dialog.
 *
 * @remarks
 * `snag_cache_dialog` carries a dialog-level info gate, a phrase giving an info portion and running an action, one
 * gated by a precondition and one with no text in the tree. `actor_break_dialog` is declared again in
 * `dialogs_overlay.xml`, which is what `--file` chooses between.
 */
describe("dialog inspect", () => {
  const box = new Sandbox(__filename);

  let explained: CliResult;
  let shadowed: CliResult;
  let overlay: CliResult;

  beforeAll(() => {
    explained = box.run("dialog inspect", ["--path", TREE, "--source", "directory", "snag_cache_dialog"]);
    shadowed = box.run("dialog inspect", ["--path", TREE, "--source", "directory", "actor_break_dialog"]);
    overlay = box.run("dialog inspect", [
      "--path",
      TREE,
      "--source",
      "directory",
      "actor_break_dialog",
      "--file",
      "configs\\gameplay\\DIALOGS_OVERLAY.xml",
    ]);

    box.run("dialog inspect", [
      "--path",
      TREE,
      "--source",
      "directory",
      "snag_cache_dialog",
      "--silent",
      "--report",
      box.at("report.json"),
    ]);
  });

  it("should explain the dialog's conditions and what each phrase says, leads to, gives and runs", () => {
    expect(explained).toMatchSnapshot();
  });

  it("should read the first declaration and name the files declaring the dialog again", () => {
    expect(shadowed).toMatchSnapshot();
  });

  // The file is named the way a person types it, so the match ignores case as engine paths do.
  it("should read the declaration of the file asked for", () => {
    expect(overlay).toMatchSnapshot();
  });

  it("should report every element of every phrase in document order", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should refuse a dialog no file declares", () => {
    expect(
      box.run("dialog inspect", ["--path", TREE, "--source", "directory", "nothing"], { expectExit: 1 })
    ).toMatchSnapshot();
  });

  it("should refuse a file that does not declare the dialog", () => {
    expect(
      box.run(
        "dialog inspect",
        [
          "--path",
          TREE,
          "--source",
          "directory",
          "snag_cache_dialog",
          "--file",
          "configs\\gameplay\\dialogs_overlay.xml",
        ],
        { expectExit: 1 }
      )
    ).toMatchSnapshot();
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
