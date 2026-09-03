import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt, envelopeOf, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const MOD_ARGS: Array<string> = ["--path", resource("mod-text"), "--source", "directory"];

describe("translation parse meets damaged input", () => {
  const box = new Sandbox(__filename);

  let reported: CliResult;
  let piped: CliResult;
  let strict: CliResult;

  beforeAll(() => {
    // The fixture carries a malformed table, a document that is not a string table at all, and a
    // repeated id. Each costs its own strings and nothing else: an import over somebody else's mod
    // is expected to meet a few.
    reported = box.run("translation parse", [
      ...MOD_ARGS,
      "--language",
      "eng",
      "--output",
      box.at("sources"),
      "--report",
      box.at("report.json"),
    ]);

    // The same payload the other way out: one compact envelope on stdout, human output on stderr, so
    // a caller can pipe the document straight into a tool without the log lines corrupting it.
    piped = box.run("translation parse", [...MOD_ARGS, "--language", "eng", "--output", box.at("piped"), "--json"]);

    strict = box.run(
      "translation parse",
      [...MOD_ARGS, "--language", "eng", "--output", box.at("strict"), "--strict"],
      { expectExit: 3 }
    );
  });

  it("should keep going and report what it could not read", () => {
    expect(reported).toMatchSnapshot();
  });

  // The same input under --strict is what a build step gates on.
  it("should fail under strict", () => {
    expect(strict).toMatchSnapshot();
  });

  it("should carry its findings under the envelope result", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

    expect(envelope.command).toEqual(["translation", "parse"]);
    expect(JSON.stringify(envelope.result)).toContain("translations.unreadable");
    expect(JSON.stringify(envelope.result)).toContain("translations.duplicate");
  });

  it("should report what it read and changed", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should write the same envelope to stdout under --json", () => {
    const envelope: CommandEnvelope = envelopeOf(piped);

    expect(envelope.command).toEqual(["translation", "parse"]);
    expect(envelope.outcome).toBe("success");
    expect(JSON.stringify(envelope.result)).toContain("translations.unreadable");
  });

  // stdout carries the document and nothing else; every human line moved to stderr.
  it("should keep human output off stdout under --json", () => {
    expect(piped.stdout).toHaveLength(1);
    expect(piped.stderr.join(" ")).toContain("Read");
  });

  // Both reporting modes carry one payload, not two shapes of one. Compared on the census rather than
  // the whole document because only the piped stream is normalized, so the durations either side of
  // this are not the same text even when the run is identical.
  it("should print the same payload it would have written", () => {
    const pipedResult = envelopeOf(piped).result as { census: unknown };
    const writtenResult = envelopeAt(box.at("report.json")).result as { census: unknown };

    expect(pipedResult.census).toEqual(writtenResult.census);
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
