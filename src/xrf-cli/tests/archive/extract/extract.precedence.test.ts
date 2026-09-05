import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const EXACT_PATH = "textures/wpn/exact.dds";
const CASE_BASE_PATH = "textures/wpn/case-only.dds";
const CASE_PATCH_PATH = "textures/wpn/CASE-ONLY.DDS";

describe("archive extract precedence", () => {
  const box = new Sandbox(__filename);

  let exact: CliResult;
  let baseCase: CliResult;
  let patchCase: CliResult;

  beforeAll(() => {
    box.write(`base/${EXACT_PATH}`, "base exact bytes");
    box.write(`patch/${EXACT_PATH}`, "patch exact bytes");
    box.write(`base/${CASE_BASE_PATH}`, "base case bytes");
    box.write(`patch/${CASE_PATCH_PATH}`, "patch case bytes");

    box.run("archive pack", ["--path", box.at("base"), "--dest", box.at("archives"), "--name", "base"]);
    box.run("archive pack", ["--path", box.at("patch"), "--dest", box.at("archives"), "--name", "patch"]);

    exact = box.run("archive extract", [
      "--path",
      box.at("archives"),
      "--file",
      EXACT_PATH.replaceAll("/", "\\"),
      "--dest",
      box.at("exact.dds"),
      "--report",
      box.at("exact-report.json"),
    ]);
    baseCase = box.run("archive extract", [
      "--path",
      box.at("archives"),
      "--file",
      CASE_BASE_PATH.replaceAll("/", "\\"),
      "--dest",
      box.at("base-case.dds"),
      "--report",
      box.at("base-case-report.json"),
    ]);
    patchCase = box.run("archive extract", [
      "--path",
      box.at("archives"),
      "--file",
      CASE_PATCH_PATH.replaceAll("/", "\\"),
      "--dest",
      box.at("patch-case.dds"),
      "--report",
      box.at("patch-case-report.json"),
    ]);
  });

  it("should extract the later archive when the logical names match exactly", () => {
    expect(exact.exitCode).toBe(0);
    expect(box.sha("exact.dds")).toBe(sha(box.at(`patch/${EXACT_PATH}`)));
  });

  it("should select each authored spelling of a case-only pair", () => {
    expect(baseCase.exitCode).toBe(0);
    expect(patchCase.exitCode).toBe(0);
    expect(box.sha("base-case.dds")).toBe(sha(box.at(`base/${CASE_BASE_PATH}`)));
    expect(box.sha("patch-case.dds")).toBe(sha(box.at(`patch/${CASE_PATCH_PATH}`)));
  });

  it("should write the expected files", () => {
    expect(box.json("exact-report.json")).toMatchSnapshot();
    expect(box.json("base-case-report.json")).toMatchSnapshot();
    expect(box.json("patch-case-report.json")).toMatchSnapshot();
    expect(
      box.manifest({ normalized: ["exact-report.json", "base-case-report.json", "patch-case-report.json"] })
    ).toMatchSnapshot();
  });
});
