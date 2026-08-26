import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { envelopeAt, type CommandEnvelope } from "#/test/envelope";
import { Sandbox, type CliResult } from "#/test/sandbox";

const SOURCE = resource("translations");

describe("translation verify", () => {
  const box = new Sandbox(__filename);

  let all: CliResult;
  let english: CliResult;
  let report: CliResult;

  beforeAll(() => {
    // The json source deliberately translates only some languages, so a full check reports the
    // gaps. Without --strict that is a report rather than a failure.
    all = box.run("translation verify", ["--path", SOURCE]);
    english = box.run("translation verify", ["--path", SOURCE, "--language", "eng"]);
    report = box.run("translation verify", ["--path", SOURCE, "--report", box.at("report.json")]);
  });

  it("should report gaps across every language", () => {
    expect(all).toMatchSnapshot();
  });

  // Every key is translated into english, so narrowing to it finds nothing missing.
  it("should find nothing missing in a complete language", () => {
    expect(english).toMatchSnapshot();
  });

  it("should write a structured report", () => {
    expect(report).toMatchSnapshot();
  });

  // Strict turns the same gaps into a non-zero answer, which is what a build pipeline would gate on.
  it("should fail under strict when translations are missing", () => {
    expect(box.run("translation verify", ["--path", SOURCE, "--strict"], { expectExit: 3 })).toMatchSnapshot();
  });

  // The command's own counts and findings reach a caller under the shared envelope's `result`,
  // which is what moved when reporting became generic. The envelope itself is pinned in
  // `cli/reporting`.
  it("should carry its findings under the envelope result", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

    expect(envelope.command).toEqual(["translation", "verify"]);
    expect(JSON.stringify(envelope.result)).toContain("translations.missing");
  });

  // The document itself, not a hash of it: every field, name and nesting level reaches the diff,
  // so a change to the reported shape is readable rather than merely detected.
  it("should report the gaps it found", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
