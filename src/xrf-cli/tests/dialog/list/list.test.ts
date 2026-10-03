import { beforeAll, describe, expect, it } from "@jest/globals";

import { dialogPartners } from "#/xrf-cli/test/constants";
import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const TREE = dialogPartners();

/**
 * What `dialog list` says about a whole tree.
 *
 * @remarks
 * `dialog-partners` declares `actor_break_dialog` twice, once more in `dialogs_overlay.xml` as a mod overlay would,
 * and carries text in `eng` alone, so a listing in another language falls back to the translation keys.
 */
describe("dialog list", () => {
  const box = new Sandbox(__filename);

  let listed: CliResult;
  let untranslated: CliResult;
  let report: CliResult;

  beforeAll(() => {
    listed = box.run("dialog list", ["--path", TREE, "--source", "directory"]);
    untranslated = box.run("dialog list", ["--path", TREE, "--source", "directory", "--language", "ukr"]);
    report = box.run("dialog list", ["--path", TREE, "--source", "directory", "--report", box.at("report.json")]);
  });

  it("should list every dialog with its file, phrase count and opening line", () => {
    expect(listed).toMatchSnapshot();
  });

  // Each declaration is its own row, so an overlay is visible rather than folded into the dialog it shadows.
  it("should list both declarations of a dialog two files hold", () => {
    expect(listed.stdout.filter((line: string) => line.startsWith("actor_break_dialog "))).toHaveLength(2);
  });

  it("should show the translation keys for a language the tree holds no text in", () => {
    expect(untranslated).toMatchSnapshot();
  });

  it("should write a structured report", () => {
    expect(report).toMatchSnapshot();
  });

  it("should carry its dialogs under the envelope result", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

    expect(envelope.command).toEqual(["dialog", "list"]);
    expect(envelope.outcome).toBe("success");
  });

  it("should report each dialog with its conditions and no offers", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
