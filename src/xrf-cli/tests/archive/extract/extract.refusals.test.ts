import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive extract refusals", () => {
  const box = new Sandbox(__filename);

  let missing: CliResult;
  let blocked: CliResult;
  let conflictingSelectors: CliResult;
  let missingSentinel: string;
  let blockedSentinel: string;
  let selectorSentinel: string;

  beforeAll(() => {
    box.write("source/configs/one.ltx", "archived bytes");
    box.run("archive pack", ["--path", box.at("source"), "--dest", box.at("packed"), "--name", "fixture"]);
    box.run("archive extract", [
      "--path",
      box.at("packed/fixture.db"),
      "--file",
      "configs\\one.ltx",
      "--dest",
      box.at("control.ltx"),
    ]);

    box.write("destination/missing.ltx", "missing sentinel");
    missingSentinel = sha(box.at("destination/missing.ltx"));
    box.write("destination/blocked/sentinel.ltx", "blocked sentinel");
    blockedSentinel = sha(box.at("destination/blocked/sentinel.ltx"));
    box.write("destination/selectors.ltx", "selector sentinel");
    selectorSentinel = sha(box.at("destination/selectors.ltx"));

    missing = box.run(
      "archive extract",
      [
        "--path",
        box.at("packed/fixture.db"),
        "--file",
        "configs\\missing.ltx",
        "--dest",
        box.at("destination/missing.ltx"),
        "--report",
        box.at("missing-report.json"),
      ],
      { expectExit: 1 }
    );
    blocked = box.run(
      "archive extract",
      [
        "--path",
        box.at("packed/fixture.db"),
        "--file",
        "configs\\one.ltx",
        "--dest",
        box.at("destination/blocked"),
        "--report",
        box.at("blocked-report.json"),
      ],
      { expectExit: 1 }
    );
    conflictingSelectors = box.run(
      "archive extract",
      [
        "--path",
        box.at("packed/fixture.db"),
        "--file",
        "configs\\one.ltx",
        "--directory",
        "configs",
        "--dest",
        box.at("destination/selectors.ltx"),
      ],
      { expectExit: 2 }
    );
  });

  it("should refuse a missing logical file without replacing its destination", () => {
    expect(missing.stderr.join("\n")).toContain("Cannot extract 'configs\\missing.ltx'");
    expect(box.json("missing-report.json")).toMatchObject({ exitCode: 1, outcome: "executionFailed", result: null });
    expect(box.sha("destination/missing.ltx")).toBe(missingSentinel);
  });

  it("should refuse a file destination obstructed by a directory without touching it", () => {
    expect(blocked.exitCode).toBe(1);
    expect(box.sha("control.ltx")).toBe(box.sha("source/configs/one.ltx"));
    expect(box.json("blocked-report.json")).toMatchObject({
      error: expect.stringMatching(/^IO error:/),
      exitCode: 1,
      outcome: "executionFailed",
      result: null,
    });
    expect(box.sha("destination/blocked/sentinel.ltx")).toBe(blockedSentinel);
  });

  it("should reject mutually exclusive selectors before writing the destination", () => {
    expect(conflictingSelectors.stderr.join("\n")).toContain("cannot be used with");
    expect(box.sha("destination/selectors.ltx")).toBe(selectorSentinel);
    expect(fs.existsSync(box.at("destination/selectors.ltx"))).toBe(true);
  });

  it("should write the expected files", () => {
    expect(box.json("missing-report.json")).toMatchSnapshot();
    expect(box.json("blocked-report.json")).toMatchSnapshot({ error: expect.any(String) });
    // The parsed report above pins its contract; its OS-specific error bytes cannot be a portable hash golden.
    expect(
      box
        .manifest({ normalized: ["missing-report.json"] })
        .map((file) => (file.path === "blocked-report.json" ? { path: file.path } : file))
    ).toMatchSnapshot();
  });
});
