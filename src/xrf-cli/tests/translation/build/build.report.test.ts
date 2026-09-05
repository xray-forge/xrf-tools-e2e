import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeOf } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = resource("translations");

describe("translation build reporting", () => {
  const box = new Sandbox(__filename);

  let piped: CliResult;
  let report: CliResult;

  beforeAll(() => {
    piped = box.run("translation build", ["--path", SOURCE, "--output", box.at("piped"), "--json"]);
    report = box.run("translation build", [
      "--path",
      SOURCE,
      "--output",
      box.at("reported"),
      "--report",
      box.at("report.json"),
    ]);
  });

  it("should write a structured report", () => {
    expect(report).toMatchSnapshot();
  });

  it("should write the same payload to stdout under --json", () => {
    const pipedEnvelope = envelopeOf(piped);

    expect(pipedEnvelope.command).toEqual(["translation", "build"]);
    expect(pipedEnvelope.outcome).toBe("success");

    const reportedEnvelope = box.json("report.json");

    if (typeof reportedEnvelope !== "object" || reportedEnvelope === null || !("result" in reportedEnvelope)) {
      throw new Error("Expected a report envelope with a result");
    }

    expect(reportedEnvelope.result).toEqual(pipedEnvelope.result);
  });

  // stdout carries the document and nothing else; every human line moved to stderr.
  it("should keep human output off stdout under --json", () => {
    expect(piped.stdout).toHaveLength(1);
    expect(piped.stderr.join(" ")).toContain("Building");
  });

  // A row per language is the grain of a build whose job is one string table per language. The report
  // used to say only how long the run took.
  it("should report what each language got", () => {
    expect(envelopeOf(piped).result).toMatchObject({
      sources: 2,
      files: 16,
      languages: [
        { language: "eng", files: 2, entries: 4 },
        { language: "fra", files: 2, entries: 4 },
        { language: "ger", files: 2, entries: 4 },
        { language: "ita", files: 2, entries: 4 },
        { language: "pol", files: 2, entries: 4 },
        { language: "rus", files: 2, entries: 4 },
        { language: "spa", files: 2, entries: 4 },
        { language: "ukr", files: 2, entries: 4 },
      ],
    });
  });

  it("should report the build it ran", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
