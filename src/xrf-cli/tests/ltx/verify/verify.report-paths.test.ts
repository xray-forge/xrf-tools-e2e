import * as fs from "node:fs";
import * as path from "node:path";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { type Optional } from "#/types";
import { Sandbox } from "#/xrf-cli/test/sandbox";

interface IVerifyFinding {
  ruleId: string;
  subject: string;
}

interface IVerifyReport {
  result: { checks: Array<{ findings: Array<IVerifyFinding> }> };
}

/**
 * How a scheme finding names the file it was raised in.
 */
describe("ltx verify report paths", () => {
  const box = new Sandbox(__filename);

  let subject: string;

  beforeAll(() => {
    fs.mkdirSync(box.at("project/nested"), { recursive: true });
    fs.writeFileSync(box.at("project/nested/broken.ltx"), "[demo]\n$scheme = undeclared_scheme\n");

    // A missing scheme declaration is the cheapest finding that carries a location.
    box.run("ltx verify", ["--path", box.at("project"), "--silent", "--report", box.at("report.json")], {
      expectExit: 3,
    });

    const report: IVerifyReport = JSON.parse(fs.readFileSync(box.at("report.json"), "utf8")) as IVerifyReport;

    const finding: Optional<IVerifyFinding> = report.result.checks[0]?.findings[0];

    if (finding?.ruleId !== "ltx.scheme") {
      throw new Error("Expected verification to report one scheme finding");
    }

    subject = finding.subject;
  });

  it("should name the file the finding was raised in", () => {
    expect(subject).toContain("broken.ltx");
  });

  it("should render the location with this platform's separators", () => {
    // Built from the separator constants rather than written out, so no escape can quietly make
    // the negative assertion unfalsifiable.
    const foreign: string = process.platform === "win32" ? path.posix.sep : path.win32.sep;

    expect(subject).toContain(["nested", "broken.ltx"].join(path.sep));
    expect(subject).not.toContain(["nested", "broken.ltx"].join(foreign));
  });
});
