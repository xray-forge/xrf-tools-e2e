import * as fs from "node:fs";
import * as path from "node:path";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("translation build single-file source paths", () => {
  const box = new Sandbox(__filename);

  let relative: CliResult;
  let climbing: CliResult;
  let absolute: CliResult;

  beforeAll(() => {
    const source: string = box.write("input/st_test.json", '{"st_test":{"eng":"text"}}\n');

    box.write("input/st_test.xml", "keep me");

    // The same file reached by climbing out of the sandbox and back in. Joined below `<output>/<language>`, these
    // parent components would carry the string table out of the output directory. Spelled with `/`, which every host
    // accepts and prints alike.
    const root: string = box.at("");
    const climb: string = path.posix.join(
      "..",
      "..",
      path.basename(path.dirname(root)),
      path.basename(root),
      "input",
      "st_test.json"
    );

    relative = box.run("translation build", [
      "--path",
      path.posix.join("input", "st_test.json"),
      "--dest",
      box.at("relative"),
      "--language",
      "eng",
    ]);
    climbing = box.run("translation build", ["--path", climb, "--dest", box.at("climbing"), "--language", "eng"]);
    absolute = box.run("translation build", ["--path", source, "--dest", box.at("absolute"), "--language", "eng"]);
  });

  it("should build a source named relative to the working directory", () => {
    expect(relative).toMatchSnapshot();
  });

  it("should build a source reached through parent components", () => {
    expect(climbing).toMatchSnapshot();
  });

  it("should build a source named by an absolute path", () => {
    expect(absolute).toMatchSnapshot();
  });

  // The path says where the source is read from, never where its string table goes.
  it("should write each string table under its file name inside the output", () => {
    for (const output of ["relative", "climbing", "absolute"]) {
      expect(fs.existsSync(box.at(`${output}/eng/st_test.xml`))).toBe(true);
    }

    expect(fs.readFileSync(box.at("input/st_test.xml"), "utf8")).toBe("keep me");
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
