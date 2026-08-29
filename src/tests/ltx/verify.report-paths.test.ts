import * as fs from "node:fs";
import * as path from "node:path";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox } from "#/test/sandbox";
import { type Optional } from "#/test/types";

interface ISchemeFinding {
  LtxScheme: { at: string };
}

interface ISchemeReport {
  result: { errors: Array<ISchemeFinding> };
}

/**
 * How a scheme finding names the file it was raised in.
 */
describe("ltx verify report paths", () => {
  const box = new Sandbox(__filename);

  let at: string;

  beforeAll(() => {
    fs.mkdirSync(box.at("project/nested"), { recursive: true });
    fs.writeFileSync(box.at("project/nested/broken.ltx"), "[demo]\n$scheme = undeclared_scheme\n");

    // A missing scheme declaration is the cheapest finding that carries a location.
    box.run("ltx verify", ["--path", box.at("project"), "--silent", "--report", box.at("report.json")], {
      expectExit: 3,
    });

    const report: ISchemeReport = JSON.parse(fs.readFileSync(box.at("report.json"), "utf8")) as ISchemeReport;

    const finding: Optional<ISchemeFinding> = report.result.errors[0];

    if (!finding) {
      throw new Error("Expected verification to report one scheme finding");
    }

    at = finding.LtxScheme.at;
  });

  it("should name the file the finding was raised in", () => {
    expect(at).toContain("broken.ltx");
  });

  it("should render the location with this platform's separators", () => {
    // Built from the separator constants rather than written out, so no escape can quietly make
    // the negative assertion unfalsifiable.
    const foreign: string = process.platform === "win32" ? path.posix.sep : path.win32.sep;

    expect(at).toContain(["nested", "broken.ltx"].join(path.sep));
    expect(at).not.toContain(["nested", "broken.ltx"].join(foreign));
  });
});
