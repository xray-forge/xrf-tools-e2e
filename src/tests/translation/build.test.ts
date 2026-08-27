import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { envelopeAt, envelopeOf, type CommandEnvelope } from "#/test/envelope";
import { Sandbox, type CliResult } from "#/test/sandbox";

const SOURCE = resource("translations");

describe("translation build", () => {
  const box = new Sandbox(__filename);

  let all: CliResult;
  let single: CliResult;
  let unsorted: CliResult;
  let piped: CliResult;
  let report: CliResult;

  beforeAll(() => {
    // JSON is the only source format, so every file here compiles the same way: one multi-language
    // map into one string table per language. XML used to be a source too — neutral files copied to
    // every language, and `.eng.xml` files built into one — and is not any more.
    all = box.run("translation build", ["--path", SOURCE, "--output", box.at("all")]);
    single = box.run("translation build", ["--path", SOURCE, "--output", box.at("eng"), "--language", "eng"]);
    unsorted = box.run("translation build", ["--path", SOURCE, "--output", box.at("unsorted"), "--no-sort"]);

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

  it("should build every language", () => {
    expect(all).toMatchSnapshot();
  });

  it("should build one language when asked", () => {
    expect(single).toMatchSnapshot();
  });

  it("should build without sorting", () => {
    expect(unsorted).toMatchSnapshot();
  });

  // Sorting is the default, so the two outputs must differ: the json source declares the medkit
  // before the bread, and sorting puts the bread first.
  it("should order sorted output differently from source order", () => {
    expect(box.sha("all/eng/st_items.xml")).not.toBe(box.sha("unsorted/eng/st_items.xml"));
  });

  // A missing translation compiles to the id itself, which is the engine's own fallback, so a
  // language a source does not carry still gets a complete table rather than a short one.
  it("should build a table for every language whatever the source carries", () => {
    expect(box.sha("all/eng/st_ui.xml")).not.toBe(box.sha("all/ukr/st_ui.xml"));
    expect(box.sha("all/ukr/st_ui.xml")).toBeTruthy();
  });

  it("should name the target after the json stem", () => {
    expect(box.sha("all/eng/st_ui.xml")).toBeTruthy();
    expect(box.sha("all/ukr/st_items.xml")).toBeTruthy();
  });

  it("should write a structured report", () => {
    expect(report).toMatchSnapshot();
  });

  it("should write the same envelope to stdout under --json", () => {
    const envelope: CommandEnvelope = envelopeOf(piped);

    expect(envelope.command).toEqual(["translation", "build"]);
    expect(envelope.outcome).toBe("success");
    expect(envelope.result).not.toBeNull();
  });

  // stdout carries the document and nothing else; every human line moved to stderr.
  it("should keep human output off stdout under --json", () => {
    expect(piped.stdout).toHaveLength(1);
    expect(piped.stderr.join(" ")).toContain("Building");
  });

  // A row per language is the grain of a build whose job is one string table per language. The report
  // used to say only how long the run took.
  it("should report what each language got", () => {
    const result = envelopeOf(piped).result as {
      sources: number;
      files: number;
      languages: Array<{ language: string; files: number; entries: number }>;
    };

    // Two sources, eight languages, one table each.
    expect(result.sources).toBe(2);
    expect(result.files).toBe(16);
    expect(result.languages).toHaveLength(8);
    expect(result.languages.every((row) => row.files === 2)).toBe(true);
  });

  it("should carry the same payload it wrote to a file", () => {
    const written = envelopeAt(box.at("report.json")).result as { sources: number; files: number };

    expect(written.sources).toBe(2);
    expect(written.files).toBe(16);
  });

  it("should report the build it ran", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
