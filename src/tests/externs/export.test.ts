import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const DECLARATIONS = resource("declarations");

describe("export-externs", () => {
  const box = new Sandbox(__filename);

  let json: CliResult;
  let xml: CliResult;
  let html: CliResult;
  let check: CliResult;
  let drifted: CliResult;
  let crlf: CliResult;

  beforeAll(() => {
    json = box.run("export-externs", [DECLARATIONS, "--format", "json", "--output", box.at("externs.json")]);
    xml = box.run("export-externs", [DECLARATIONS, "--format", "xml", "--output", box.at("externs.xml")]);
    html = box.run("export-externs", [DECLARATIONS, "--format", "html", "--output", box.at("externs.html")]);

    // Checking the artifact that was just written must agree with it.
    check = box.run("export-externs", [DECLARATIONS, "--check", box.at("externs.json")]);

    // A manifest that no longer matches the declarations is what --check exists to catch, so the
    // artifact is edited out from under it.
    drifted = box.run("export-externs", [DECLARATIONS, "--check", box.write("drifted.json", '{ "exports": {} }\n')], {
      expectExit: 1,
    });

    // Both endings are asked for explicitly. The default follows the platform, so on Windows a
    // crlf run is byte-identical to the default one and would prove nothing on its own.
    crlf = box.run("export-externs", [
      DECLARATIONS,
      "--format",
      "json",
      "--output",
      box.at("externs-crlf.json"),
      "--line-endings",
      "crlf",
    ]);
    box.run("export-externs", [
      DECLARATIONS,
      "--format",
      "json",
      "--output",
      box.at("externs-lf.json"),
      "--line-endings",
      "lf",
    ]);
  });

  it("should export json", () => {
    expect(json).toMatchSnapshot();
  });

  it("should export xml", () => {
    expect(xml).toMatchSnapshot();
  });

  it("should export html", () => {
    expect(html).toMatchSnapshot();
  });

  it("should accept an artifact that matches", () => {
    expect(check).toMatchSnapshot();
  });

  it("should reject an artifact that drifted", () => {
    expect(drifted).toMatchSnapshot();
  });

  it("should honour an explicit line ending", () => {
    expect(crlf).toMatchSnapshot();
  });

  // The same manifest written with different line endings cannot be the same bytes.
  it("should write different bytes for each line ending", () => {
    expect(box.sha("externs-crlf.json")).not.toBe(box.sha("externs-lf.json"));
  });

  // The manifest carries the documented and undocumented externs alike, so the contents are what
  // the snapshot has to cover rather than just the file list.
  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["externs.json", "externs.xml", "externs.html"] })).toMatchSnapshot();
  });
});
