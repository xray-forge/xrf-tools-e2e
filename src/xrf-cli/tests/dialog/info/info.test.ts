import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const GAMEDATA = gamedata();

/**
 * The command reads dialog xml out of a world and reports what it holds, so the census is its
 * output rather than a side effect. `configs/gameplay/` is shaped for it: one file in the shipped
 * form, and one carrying a `go_back` phrase element the schema does not define, so the schema check
 * has exactly one real finding and `--strict` has something to fail on.
 */
describe("dialog info", () => {
  const box = new Sandbox(__filename);

  let swept: CliResult;
  let prefixed: CliResult;
  let detailed: CliResult;
  let report: CliResult;
  let silent: CliResult;
  let elsewhere: CliResult;

  beforeAll(() => {
    swept = box.run("dialog info", ["--path", GAMEDATA]);
    prefixed = box.run("dialog info", ["--path", GAMEDATA, "--prefix", "configs\\gameplay"]);
    detailed = box.run("dialog info", ["--path", GAMEDATA, "--verbose"]);
    report = box.run("dialog info", ["--path", GAMEDATA, "--report", box.at("report.json")]);

    // Findings are chatter, so a silent run says nothing at all until the verdict is a failure.
    silent = box.run("dialog info", ["--path", GAMEDATA, "--silent"]);

    // Only the subtree named by the prefix is searched, and no dialog lives under meshes. Nothing
    // swept is not a pass: it answers the operational 1 rather than reporting a clean tree.
    elsewhere = box.run("dialog info", ["--path", GAMEDATA, "--prefix", "meshes"], { expectExit: 1 });
  });

  it("should count what the dialogs hold", () => {
    expect(swept).toMatchSnapshot();
  });

  // The dialogs all live under the prefix, so narrowing to it must reach the same census. That is
  // what separates a prefix that filters from one that is ignored.
  it("should reach the same census when narrowed to the subtree holding them", () => {
    expect(prefixed).toEqual(swept);
  });

  // The count of findings is reported at normal verbosity and the findings themselves are not: a
  // sweep of a real tree produces more of them than a terminal is useful for.
  it("should name each finding under verbose output", () => {
    expect(detailed).toMatchSnapshot();
  });

  it("should write a structured report", () => {
    expect(report).toMatchSnapshot();
  });

  // The command's own census and checks reach a caller under the shared envelope's `result`, which
  // is what moved when reporting became generic. The envelope itself is pinned in `cli/reporting`.
  it("should carry its checks under the envelope result", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

    expect(envelope.command).toEqual(["dialog", "info"]);
    expect(envelope.outcome).toBe("success");
    expect(JSON.stringify(envelope.result)).toContain("dialog.schema");
  });

  it("should say nothing when silenced", () => {
    expect(silent).toMatchSnapshot();
  });

  // Reporting is the default and answers success even with findings, so a tally can be run
  // casually. Strict is the mode that judges, and it answers the check failure 3.
  it("should fail under strict when a file is off schema", () => {
    expect(box.run("dialog info", ["--path", GAMEDATA, "--strict"], { expectExit: 3 })).toMatchSnapshot();
  });

  // A failure still reports its verdict at every verbosity, which is what a script reads.
  it("should report the failure even when silenced", () => {
    expect(box.run("dialog info", ["--path", GAMEDATA, "--silent", "--strict"], { expectExit: 3 })).toMatchSnapshot();
  });

  it("should refuse a prefix holding no dialogs", () => {
    expect(elsewhere).toMatchSnapshot();
  });

  // The document itself, not a hash of it: every field, name and nesting level reaches the diff, so
  // a change to the reported shape is readable rather than merely detected.
  it("should report the census and checks it found", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
