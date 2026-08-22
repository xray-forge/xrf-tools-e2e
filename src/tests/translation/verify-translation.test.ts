import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const SOURCE = resource("translations");

describe("verify-translation", () => {
  const box = new Sandbox(__filename);

  let all: CliResult;
  let english: CliResult;
  let report: CliResult;

  beforeAll(() => {
    // The json source deliberately translates only some languages, so a full check reports the
    // gaps. Without --strict that is a report rather than a failure.
    all = box.run("verify-translation", ["--path", SOURCE]);
    english = box.run("verify-translation", ["--path", SOURCE, "--language", "eng"]);
    report = box.run("verify-translation", ["--path", SOURCE, "--report", box.at("report.json")]);
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
    expect(box.run("verify-translation", ["--path", SOURCE, "--strict"], { expectExit: 3 })).toMatchSnapshot();
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
