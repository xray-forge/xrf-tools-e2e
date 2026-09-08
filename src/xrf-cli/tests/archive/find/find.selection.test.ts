import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive find selection", () => {
  const box = new Sandbox(__filename);

  let caseInsensitive: CliResult;
  let noMatch: CliResult;
  let ordered: CliResult;
  let directories: CliResult;

  beforeAll(() => {
    box.write("source/nested/System_Alpha.ltx", "alpha\n");
    box.write("source/nested/system_copy.ltx", "alpha\n");
    box.write("source/zeta.ltx", "zeta\n");
    box.run("archive pack", ["--path", box.at("source"), "--dest", box.at("packed"), "--name", "fixture"]);

    caseInsensitive = box.run("archive find", [
      "--path",
      box.at("packed/fixture.db"),
      "--query",
      "CoPy",
      "--files",
      "--silent",
      "--report",
      box.at("case.json"),
    ]);
    noMatch = box.run("archive find", [
      "--path",
      box.at("packed/fixture.db"),
      "--query",
      "absent",
      "--files",
      "--silent",
      "--report",
      box.at("absent.json"),
    ]);
    ordered = box.run("archive find", [
      "--path",
      box.at("packed/fixture.db"),
      "--query",
      ".ltx",
      "--files",
      "--silent",
      "--report",
      box.at("ordered.json"),
    ]);
    directories = box.run("archive find", [
      "--path",
      box.at("packed/fixture.db"),
      "--query",
      "nested",
      "--directories",
      "--silent",
      "--report",
      box.at("directories.json"),
    ]);
  });

  it("should find a file entry case-insensitively and retain a sharer the query filtered out", () => {
    const report: CommandEnvelope = envelopeAt(box.at("case.json"));

    expect(caseInsensitive.exitCode).toBe(0);
    expect(report).toMatchObject({ command: ["archive", "find"], outcome: "success", exitCode: 0 });
    expect(report.result).toMatchObject({
      query: "copy",
      total: 1,
      entries: [{ name: "nested\\system_copy.ltx", sharedWith: ["nested\\System_Alpha.ltx"] }],
    });
  });

  it("should report an empty successful result when no file name matches", () => {
    const report: CommandEnvelope = envelopeAt(box.at("absent.json"));

    expect(noMatch.exitCode).toBe(0);
    expect(report.result).toEqual({ entries: [], query: "absent", total: 0 });
  });

  it("should keep multiple file matches in logical-name order", () => {
    const report: CommandEnvelope = envelopeAt(box.at("ordered.json"));

    expect(ordered.exitCode).toBe(0);
    expect(report.result).toMatchObject({
      total: 3,
      entries: [{ name: "nested\\System_Alpha.ltx" }, { name: "nested\\system_copy.ltx" }, { name: "zeta.ltx" }],
    });
  });

  it("should select directory records without including files", () => {
    const report: CommandEnvelope = envelopeAt(box.at("directories.json"));

    expect(directories.exitCode).toBe(0);
    expect(report.result).toEqual({
      entries: [expect.objectContaining({ isDirectory: true, name: "nested\\" })],
      query: "nested",
      total: 1,
    });
  });

  it("should record each machine-readable selection", () => {
    expect(box.json("case.json")).toMatchSnapshot();
    expect(box.json("absent.json")).toMatchSnapshot();
    expect(box.json("ordered.json")).toMatchSnapshot();
    expect(box.json("directories.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(
      box.manifest({ normalized: ["case.json", "absent.json", "ordered.json", "directories.json"] })
    ).toMatchSnapshot();
  });
});
