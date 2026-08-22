import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const DECLARATIONS = resource("declarations");

describe("export-externs drift detection", () => {
  const box = new Sandbox(__filename);

  let check: CliResult;
  let drifted: CliResult;

  beforeAll(() => {
    box.run("export-externs", [DECLARATIONS, "--format", "json", "--output", box.at("externs.json")]);

    // Checking the artifact that was just written must agree with it.
    check = box.run("export-externs", [DECLARATIONS, "--check", box.at("externs.json")]);

    // A manifest that no longer matches the declarations is what --check exists to catch.
    drifted = box.run("export-externs", [DECLARATIONS, "--check", box.write("drifted.json", '{ "exports": {} }\n')], {
      expectExit: 3,
    });
  });

  it("should accept an artifact that matches", () => {
    expect(check).toMatchSnapshot();
  });

  it("should reject an artifact that drifted", () => {
    expect(drifted).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["externs.json"] })).toMatchSnapshot();
  });
});
