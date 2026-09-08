import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

interface PackResult {
  filesAliased: number;
}

describe("archive pack names and aliases", () => {
  const box = new Sandbox(__filename);

  let packed: CliResult;
  let unpacked: CliResult;

  beforeAll(() => {
    box.write("source/nested/empty.ltx", "");
    box.write("source/nested/payload.ltx", "same payload\n");
    box.write("source/nested/payload_copy.ltx", "same payload\n");

    packed = box.run("archive pack", [
      "--path",
      box.at("source"),
      "--dest",
      box.at("packed"),
      "--name",
      "fixture",
      "--report",
      box.at("pack.json"),
      "--verbose",
    ]);
    unpacked = box.run("archive unpack", ["--path", box.at("packed/fixture.db"), "--dest", box.at("unpacked")]);
  });

  it("should preserve an empty nested file and repeated payload aliases", () => {
    expect(packed).toMatchSnapshot();
    expect(unpacked).toMatchSnapshot();
    expect(fs.statSync(box.at("unpacked/gamedata/nested/empty.ltx")).size).toBe(0);
    expect(box.sha("unpacked/gamedata/nested/payload_copy.ltx")).toBe(box.sha("source/nested/payload.ltx"));

    const result = envelopeAt(box.at("pack.json")).result as PackResult;

    expect(result.filesAliased).toBe(1);
    expect(packed.stdout).toContain("Aliased: nested\\payload_copy.ltx -> nested\\payload.ltx");
  });

  it("should record the report as a readable document", () => {
    expect(box.json("pack.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["pack.json"] })).toMatchSnapshot();
  });
});
