import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

const DECLARATIONS = resource("declarations");

/**
 * What the two commands that produce developer artifacts report to a machine.
 */
describe("tooling reports", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("docs generate", ["--output", box.at("docs"), "--silent", "--report", box.at("docs.json")]);
    box.run("docs generate", [
      "--output",
      box.at("docs"),
      "--check",
      "--silent",
      "--report",
      box.at("docs-check.json"),
    ]);

    box.write("drifted/README.md", "# Not the generated docs\n");
    box.run(
      "docs generate",
      ["--output", box.at("drifted"), "--check", "--silent", "--report", box.at("drifted.json")],
      {
        expectExit: 3,
      }
    );

    box.run("externs export", [
      DECLARATIONS,
      "--format",
      "json",
      "--output",
      box.at("externs.json"),
      "--silent",
      "--report",
      box.at("externs-report.json"),
    ]);
    box.run("externs export", [
      DECLARATIONS,
      "--check",
      box.at("externs.json"),
      "--silent",
      "--report",
      box.at("externs-check.json"),
    ]);
  });

  it("should report the pages a generation wrote", () => {
    expect(box.json("docs.json")).toMatchSnapshot();
  });

  it("should report a check that found no drift", () => {
    expect(box.json("docs-check.json")).toMatchSnapshot();
  });

  // The requirement the contract exists for: a failing check still says what drifted.
  it("should report what drifted when the check fails", () => {
    expect(box.json("drifted.json")).toMatchSnapshot();
  });

  it("should report an extern export", () => {
    expect(box.json("externs-report.json")).toMatchSnapshot();
  });

  it("should report an extern check", () => {
    expect(box.json("externs-check.json")).toMatchSnapshot();
  });
});
