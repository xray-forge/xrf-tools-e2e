import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const MOD = resource("mod-text");

/** Points at the mod root and lets the run resolve the text tree and language directory below it. */
const MOD_ARGS: Array<string> = ["--path", MOD, "--source", "directory"];

describe("translation parse", () => {
  const box = new Sandbox(__filename);

  let english: CliResult;
  let ukrainian: CliResult;
  let again: CliResult;

  beforeAll(() => {
    // Named at the mod root with a language: the run resolves `configs\text` and then the language's
    // own directory below it, rather than making the caller spell out a prefix.
    english = box.run("translation parse", [...MOD_ARGS, "--language", "eng", "--output", box.at("merged")]);
    ukrainian = box.run("translation parse", [...MOD_ARGS, "--language", "ukr", "--output", box.at("merged")]);
    again = box.run("translation parse", [...MOD_ARGS, "--language", "eng", "--output", box.at("merged")]);

    // The same two languages the other way round, to prove the result does not remember the order.
    box.run("translation parse", [...MOD_ARGS, "--language", "ukr", "--output", box.at("reversed")]);
    box.run("translation parse", [...MOD_ARGS, "--language", "eng", "--output", box.at("reversed")]);
  });

  it("should import the first language", () => {
    expect(english).toMatchSnapshot();
  });

  it("should merge the second language into the same sources", () => {
    expect(ukrainian).toMatchSnapshot();
  });

  // Nothing changed, so nothing is rewritten: a re-import must not churn a diff over the whole tree.
  it("should write nothing when re-run", () => {
    expect(again).toMatchSnapshot();
  });

  // The merged document itself, not a hash of it: id order, language key order, the null placeholder
  // for the id English has and Ukrainian does not, and the array form of a multi-line description all
  // reach the diff.
  it("should merge both languages into one document", () => {
    expect(box.json("merged/st_items.json")).toMatchSnapshot();
  });

  it("should fill a language gap with an explicit null", () => {
    expect(box.json("merged/st_ui.json")).toMatchSnapshot();
  });

  // Two tables of the same name in different directories must not land on top of each other.
  it("should keep nested tables apart", () => {
    expect(box.json("merged/nested/st_items.json")).toMatchSnapshot();
  });

  // The last of a repeated id is what `CStringTable::Load` leaves in the table, so it is what the
  // import keeps.
  it("should keep the last of a repeated id", () => {
    expect(box.json("merged/st_dupes.json")).toMatchSnapshot();
  });

  // The whole workflow is "run once per language and merge", so an output remembering which run
  // touched it first would churn a diff for nothing.
  it("should not depend on the order the languages were run in", () => {
    for (const file of ["st_items.json", "st_ui.json", "st_dupes.json", "nested/st_items.json"]) {
      expect(box.sha(`reversed/${file}`)).toBe(box.sha(`merged/${file}`));
    }
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
