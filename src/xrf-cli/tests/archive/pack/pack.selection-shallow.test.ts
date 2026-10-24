import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack shallow selection", () => {
  const box = new Sandbox(__filename);

  let direct: CliResult;
  let fromLtx: CliResult;
  let fromJson: CliResult;
  let listed: CliResult;

  beforeAll(() => {
    box.write("source/shallow-include/own.ltx", "own\n");
    box.write("source/shallow-include/nested/child.ltx", "nested\n");

    const ltx = box.write("selection.ltx", ["[include_folders]", "shallow-include = false", ""].join("\n"));
    const json = box.write(
      "selection.json",
      JSON.stringify({ includeDirectories: [{ path: "shallow-include", isRecursive: false }] }, null, 2)
    );
    const common = ["--path", box.at("source"), "--name", "fixture"];

    direct = box.run("archive pack", [
      ...common,
      "--dest",
      box.at("direct"),
      "--include-directory-shallow",
      "shallow-include",
    ]);
    fromLtx = box.run("archive pack", [...common, "--dest", box.at("ltx"), "--config", ltx]);
    fromJson = box.run("archive pack", [...common, "--dest", box.at("json"), "--config", json]);
    listed = box.run("archive list", ["--path", box.at("direct/fixture.db"), "--files"]);
  });

  it("should select only a shallow include's own files through direct, LTX, and JSON configuration", () => {
    expect(direct).toMatchSnapshot();
    expect(fromLtx).toMatchSnapshot();
    expect(fromJson).toMatchSnapshot();
    expect(listed.stdout).toEqual(["shallow-include\\own.ltx", "Listed 1 entry in <duration>"]);
    expect(box.sha("ltx/fixture.db")).toBe(box.sha("direct/fixture.db"));
    expect(box.sha("json/fixture.db")).toBe(box.sha("direct/fixture.db"));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
