import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack name refusals", () => {
  const box = new Sandbox(__filename);

  let escaped: CliResult;
  let invalidName: CliResult;

  beforeAll(() => {
    box.write("source/known.ltx", "known\n");
    box.write("outside.ltx", "outside\n");

    escaped = box.run(
      "archive pack",
      [
        "--path",
        box.at("source"),
        "--dest",
        box.at("escaping"),
        "--name",
        "fixture",
        "--include-file",
        "..\\outside.ltx",
      ],
      { expectExit: 1 }
    );
    invalidName = box.run(
      "archive pack",
      ["--path", box.at("source"), "--dest", box.at("invalid-name"), "--name", "..\\outside"],
      { expectExit: 1 }
    );
  });

  it("should refuse source-escaping include names without publishing", () => {
    expect(escaped).toMatchSnapshot();
    expect(fs.existsSync(box.at("escaping/fixture.db"))).toBe(false);
  });

  it("should refuse a volume basename that leaves its destination", () => {
    expect(invalidName).toMatchSnapshot();
    expect(fs.existsSync(box.at("outside.db"))).toBe(false);
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
