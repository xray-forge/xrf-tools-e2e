import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const DECLARATIONS = resource("declarations");

describe("externs export drift detection", () => {
  const box = new Sandbox(__filename);

  let check: CliResult;
  let drifted: CliResult;

  beforeAll(() => {
    box.run("externs export", ["--path", DECLARATIONS, "--format", "json", "--dest", box.at("externs.json")]);

    // Checking the artifact that was just written must agree with it.
    check = box.run("externs export", ["--path", DECLARATIONS, "--dest", box.at("externs.json"), "--check"]);

    // A manifest that no longer matches the declarations is what --check exists to catch.
    drifted = box.run(
      "externs export",
      ["--path", DECLARATIONS, "--dest", box.write("drifted.json", '{ "exports": {} }\n'), "--check"],
      {
        expectExit: 3,
      }
    );
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
