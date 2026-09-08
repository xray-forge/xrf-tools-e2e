import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const EXPECTED_FILES: Array<string> = [
  "configs\\ordinary.dat",
  "configs\\private-neighbor\\keep.ltx",
  "configs\\public\\release.ltx",
  "configs\\shallow\\child\\kept.ltx",
  "configs\\shallow\\own.ltx",
  "docs\\picked.ltx",
];

describe("archive pack selection", () => {
  const box = new Sandbox(__filename);

  let direct: CliResult;
  let fromLtx: CliResult;
  let fromJson: CliResult;
  let listed: CliResult;
  let listedDirectories: CliResult;
  let unpacked: CliResult;

  beforeAll(() => {
    box.write("source/configs/public/release.ltx", "release\n");
    box.write("source/configs/private/draft.ltx", "draft\n");
    box.write("source/configs/private/deeper/secret.ltx", "secret\n");
    box.write("source/configs/private-neighbor/keep.ltx", "neighbor\n");
    box.write("source/configs/shallow/own.ltx", "own\n");
    box.write("source/configs/shallow/child/kept.ltx", "child\n");
    box.write("source/configs/unwanted.xml", "unwanted\n");
    box.write("source/configs/ordinary.dat", "ordinary\n");
    box.write("source/docs/picked.ltx", "picked\n");

    const ltx = box.write(
      "selection.ltx",
      [
        "[options]",
        "exclude_exts = *.xml",
        "",
        "[include_files]",
        "docs\\picked.ltx",
        "",
        "[include_folders]",
        "configs = true",
        "",
        "[exclude_folders]",
        "configs\\private = true",
        "configs\\shallow = false",
        "",
      ].join("\n")
    );
    const json = box.write(
      "selection.json",
      JSON.stringify(
        {
          excludeExtensions: ["*.xml"],
          includeFiles: ["docs\\picked.ltx"],
          includeDirectories: [{ path: "configs", isRecursive: true }],
          excludeDirectories: [
            { path: "configs\\private", isRecursive: true },
            { path: "configs\\shallow", isRecursive: false },
          ],
        },
        null,
        2
      )
    );
    const common = ["--path", box.at("source"), "--name", "selection"];

    direct = box.run("archive pack", [
      ...common,
      "--dest",
      box.at("direct"),
      "--include-file",
      "docs\\picked.ltx",
      "--include-directory",
      "configs",
      "--exclude-directory",
      "configs\\private",
      "--exclude-directory-shallow",
      "configs\\shallow",
      "--exclude-extension",
      "*.xml",
    ]);
    fromLtx = box.run("archive pack", [...common, "--dest", box.at("ltx"), "--config", ltx]);
    fromJson = box.run("archive pack", [...common, "--dest", box.at("json"), "--config", json]);
    listed = box.run("archive list", ["--path", box.at("direct/selection.db"), "--files"]);
    listedDirectories = box.run("archive list", ["--path", box.at("direct/selection.db"), "--directories"]);
    unpacked = box.run("archive unpack", ["--path", box.at("direct/selection.db"), "--dest", box.at("unpacked")]);
  });

  it("should select the direct flag matrix", () => {
    expect(direct).toMatchSnapshot();
    expect(listed).toMatchSnapshot();
    expect(listed.stdout).toEqual([...EXPECTED_FILES, "Listed 6 entries in <duration>"]);
    expect(listedDirectories).toMatchSnapshot();
    expect(listedDirectories.stdout).not.toContain("configs\\shallow\\");
    expect(listedDirectories.stdout).toContain("configs\\shallow\\child\\");
  });

  it("should select the same logical files through LTX and JSON", () => {
    expect(fromLtx).toMatchSnapshot();
    expect(fromJson).toMatchSnapshot();
    expect(box.sha("ltx/selection.db")).toBe(box.sha("direct/selection.db"));
    expect(box.sha("json/selection.db")).toBe(box.sha("direct/selection.db"));
  });

  it("should restore every selected byte", () => {
    expect(unpacked).toMatchSnapshot();

    for (const name of EXPECTED_FILES) {
      const relative = name.replaceAll("\\", "/");

      expect(box.sha(`unpacked/gamedata/${relative}`)).toBe(box.sha(`source/${relative}`));
    }
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
