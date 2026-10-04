import { beforeAll, describe, expect, it } from "@jest/globals";

import { dialogReferences } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const TREE = dialogReferences();

/**
 * Where `dialog find` says dialogs check, give, take and call what was asked for.
 *
 * @remarks
 * `tech_drink_first_time` is checked on `tech_drink_dialog`'s entry phrase, which the engine never reads, and by two
 * greeting phrases, which it does; nothing gives it. `tech_story_dialog` leads back to its entry phrase, so that
 * phrase's condition is read. `if_actor_has_vodka` is called from two modules, one in each file.
 */
describe("dialog find", () => {
  const box = new Sandbox(__filename);

  let unGiven: CliResult;
  let givenAndTaken: CliResult;
  let functors: CliResult;
  let nothing: CliResult;

  beforeAll(() => {
    unGiven = box.run("dialog find", ["--path", TREE, "--source", "directory", "--info", "tech_drink_first_time"]);
    givenAndTaken = box.run("dialog find", ["--path", TREE, "--source", "directory", "--info", "tech_have_one_dose"]);
    functors = box.run("dialog find", [
      "--path",
      TREE,
      "--source",
      "directory",
      "--functor",
      "if_actor_has_vodka",
      "--functor",
      "dialogs_zaton.give_vodka",
    ]);
    nothing = box.run("dialog find", ["--path", TREE, "--source", "directory", "--info", "nobody_checks_this"]);

    box.run("dialog find", [
      "--path",
      TREE,
      "--source",
      "directory",
      "--info",
      "tech_drink_first_time",
      "--functor",
      "give_vodka",
      "--silent",
      "--report",
      box.at("report.json"),
    ]);
  });

  it("should mark the entry phrase's condition as never read and warn that no dialog gives the info portion", () => {
    expect(unGiven).toMatchSnapshot();
  });

  it("should list where dialogs check, give and take an info portion across files", () => {
    expect(givenAndTaken).toMatchSnapshot();
  });

  it("should match a bare function name in any module and a full name in its own", () => {
    expect(functors).toMatchSnapshot();
  });

  it("should succeed with no references for a name nothing mentions", () => {
    expect(nothing).toMatchSnapshot();
  });

  it("should report every reference with its file, dialog, phrase, element and whether it is read", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should refuse a search naming nothing to find", () => {
    expect(box.run("dialog find", ["--path", TREE, "--source", "directory"], { expectExit: 2 })).toMatchSnapshot();
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
