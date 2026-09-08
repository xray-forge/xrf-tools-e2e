import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive list selection", () => {
  const box = new Sandbox(__filename);

  let files: CliResult;
  let directories: CliResult;

  beforeAll(() => {
    box.write("source/zeta.ltx", "zeta\n");
    box.write("source/nested/alpha.ltx", "alpha\n");
    box.run("archive pack", ["--path", box.at("source"), "--dest", box.at("packed"), "--name", "fixture"]);

    files = box.run("archive list", [
      "--path",
      box.at("packed/fixture.db"),
      "--files",
      "--silent",
      "--report",
      box.at("files.json"),
    ]);
    directories = box.run("archive list", [
      "--path",
      box.at("packed/fixture.db"),
      "--directories",
      "--silent",
      "--report",
      box.at("directories.json"),
    ]);
  });

  it("should keep file and directory selectors separate", () => {
    const fileReport: CommandEnvelope = envelopeAt(box.at("files.json"));
    const directoryReport: CommandEnvelope = envelopeAt(box.at("directories.json"));

    expect(files.exitCode).toBe(0);
    expect(directories.exitCode).toBe(0);
    expect(fileReport.result).toMatchObject({
      total: 2,
      entries: [
        { name: "nested\\alpha.ltx", isDirectory: false },
        { name: "zeta.ltx", isDirectory: false },
      ],
    });
    expect(directoryReport.result).toMatchObject({
      total: 1,
      entries: [{ name: "nested\\", isDirectory: true }],
    });
  });

  it("should record both machine-readable selectors", () => {
    expect(box.json("files.json")).toMatchSnapshot();
    expect(box.json("directories.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["files.json", "directories.json"] })).toMatchSnapshot();
  });
});
