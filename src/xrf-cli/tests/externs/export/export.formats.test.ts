import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const DECLARATIONS = resource("declarations");

describe("externs export formats", () => {
  const box = new Sandbox(__filename);

  let json: CliResult;
  let xml: CliResult;
  let html: CliResult;

  beforeAll(() => {
    json = box.run("externs export", [DECLARATIONS, "--format", "json", "--output", box.at("externs.json")]);
    xml = box.run("externs export", [DECLARATIONS, "--format", "xml", "--output", box.at("externs.xml")]);
    html = box.run("externs export", [DECLARATIONS, "--format", "html", "--output", box.at("externs.html")]);
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

  // The manifest carries the documented and undocumented externs alike, so the contents are what
  // the snapshot has to cover rather than just the file list.
  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["externs.json", "externs.xml", "externs.html"] })).toMatchSnapshot();
  });
});
