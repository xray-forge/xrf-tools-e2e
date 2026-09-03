import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt, envelopeOf, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = resource("translations");

describe("translation verify", () => {
  const box = new Sandbox(__filename);

  let all: CliResult;
  let english: CliResult;
  let report: CliResult;
  let piped: CliResult;

  beforeAll(() => {
    // The json source deliberately translates only some languages, so a full check reports the
    // gaps. Without --strict that is a report rather than a failure.
    all = box.run("translation verify", ["--path", SOURCE]);
    english = box.run("translation verify", ["--path", SOURCE, "--language", "eng"]);
    report = box.run("translation verify", ["--path", SOURCE, "--report", box.at("report.json")]);

    // The same payload the other way out: one compact envelope on stdout, human output on stderr, so
    // a caller can pipe the document into a tool without the log lines corrupting it.
    piped = box.run("translation verify", ["--path", SOURCE, "--json"]);
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

  it("should write the same envelope to stdout under --json", () => {
    const envelope: CommandEnvelope = envelopeOf(piped);

    expect(envelope.command).toEqual(["translation", "verify"]);
    expect(envelope.outcome).toBe("success");
    expect(JSON.stringify(envelope.result)).toContain("translations.missing");
  });

  // stdout carries the document and nothing else; every human line moved to stderr.
  it("should keep human output off stdout under --json", () => {
    expect(piped.stdout).toHaveLength(1);
    expect(piped.stderr.join(" ")).toContain("Verifying");
  });

  // The aggregate is what makes the report readable at scale - checking a two-language import against
  // all eight languages is 149,979 findings and the same answer is 1,072 rows.
  it("should carry a row per file and language", () => {
    const result = envelopeOf(piped).result as {
      languages: Array<{ file: string; language: string; checked: number; missing: number }>;
    };

    // Two sources times eight languages, and English is complete in both.
    expect(result.languages).toHaveLength(16);
    expect(result.languages.filter((row) => row.language === "eng").every((row) => row.missing === 0)).toBe(true);
    expect(result.languages.some((row) => row.missing > 0)).toBe(true);
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
