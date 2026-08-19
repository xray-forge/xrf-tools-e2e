import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const DESCRIPTION = gamedata("configs/ui/textures_descr/ui_test_sheet.xml");

describe("unpack-texture-description file selection", () => {
  const box = new Sandbox(__filename);

  let all: CliResult;
  let selected: CliResult;
  let unknown: CliResult;

  beforeAll(() => {
    // Unpacked twice on purpose: selecting the only described file has to produce what unpacking
    // everything produces, and the comparison is the point of this file.
    all = box.run("unpack-texture-description", [
      "--description",
      DESCRIPTION,
      "--base",
      gamedata("textures"),
      "--output",
      box.at("all"),
    ]);

    selected = box.run("unpack-texture-description", [
      "--description",
      DESCRIPTION,
      "--base",
      gamedata("textures"),
      "--output",
      box.at("selected"),
      "--file",
      "ui_test_sheet",
      "--parallel",
    ]);

    // A name the description does not carry is refused with the names it does, rather than
    // producing an empty run that looks like success.
    unknown = box.run(
      "unpack-texture-description",
      [
        "--description",
        DESCRIPTION,
        "--base",
        gamedata("textures"),
        "--output",
        box.at("unknown"),
        "--file",
        "no_such_file",
      ],
      { expectExit: 1 }
    );
  });

  it("should unpack every described file", () => {
    expect(all).toMatchSnapshot();
  });

  it("should unpack only the named file, in parallel", () => {
    expect(selected).toMatchSnapshot();
  });

  it("should refuse a name the description does not carry", () => {
    expect(unknown).toMatchSnapshot();
  });

  // Selecting a file and unpacking everything have to agree, or --file changes more than which
  // files are considered.
  it("should produce the same regions whether selected or not", () => {
    expect(box.sha("selected/ui/ui_test_sheet/ui_test_left.dds")).toBe(
      box.sha("all/ui/ui_test_sheet/ui_test_left.dds")
    );
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
