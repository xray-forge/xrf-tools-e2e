import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

describe("gamedata verify read tracing", () => {
  const box = new Sandbox(__filename);

  let normal: CliResult;
  let traced: CliResult;
  let inputs: Array<ManifestFile>;

  beforeAll(() => {
    box.write("gamedata/configs/system.ltx", "[section]\r\n$scheme = $test\r\nvalue = 1\r\n");
    box.write("gamedata/configs/test.scheme.ltx", "[$test]\r\n$strict = true\r\nvalue = u32\r\n");
    inputs = box.manifest();

    normal = box.run("gamedata verify", [box.at("gamedata"), "--checks", "ltx", "--report", box.at("normal.json")]);
    traced = box.run("gamedata verify", [
      box.at("gamedata"),
      "--checks",
      "ltx",
      "--trace-reads",
      "--report",
      box.at("traced.json"),
    ]);
  });

  it("should trace physical reads of both validated inputs", () => {
    expect(box.json("traced.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        status: "passed",
        checks: [
          { verificationType: "coverage", status: "skipped", findings: [] },
          { verificationType: "collisions", status: "skipped", findings: [] },
          {
            verificationType: "ltx",
            status: "passed",
            summary: "2/2 LTX files formatted; 1/1 sections valid",
            findings: [],
          },
        ],
        reads: {
          bytes: 154,
          paths: 2,
          reads: 4,
          uniqueBytes: 77,
          hottest: [
            { path: "configs\\system.ltx", reads: 2, bytes: 78 },
            { path: "configs\\test.scheme.ltx", reads: 2, bytes: 76 },
          ],
        },
      },
    });
  });

  it("should add only the read account without changing the report or streams", () => {
    const report = box.json("traced.json");

    if (typeof report !== "object" || report === null || !("result" in report)) {
      throw new Error("Expected a verification envelope");
    }

    const result = report.result;

    if (typeof result !== "object" || result === null || !("reads" in result)) {
      throw new Error("Expected a traced verification result");
    }

    const { reads, ...withoutReads } = result;

    expect(reads).toBeDefined();
    expect({ ...report, result: withoutReads }).toEqual(box.json("normal.json"));
    expect(traced).toEqual(normal);
  });

  it("should preserve all input bytes", () => {
    expect(box.manifest().filter((file) => !["normal.json", "traced.json"].includes(file.path))).toEqual(inputs);
  });

  it("should record the trace and expected artifacts", () => {
    expect(box.json("traced.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["normal.json", "traced.json"] })).toMatchSnapshot();
  });
});
