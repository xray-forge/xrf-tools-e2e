import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const DESCRIPTION = gamedata("configs/ui/textures_descr/ui_test_sheet.xml");

describe("sprite unpack-description file selection", () => {
  const box = new Sandbox(__filename);

  let all: CliResult;
  let selected: CliResult;

  beforeAll(() => {
    // Unpacked twice on purpose: selecting the only described file has to produce what unpacking
    // everything produces, and the comparison is the point of this file.
    all = box.run("sprite unpack-description", [
      "--description",
      DESCRIPTION,
      "--base",
      gamedata("textures"),
      "--output",
      box.at("all"),
    ]);

    selected = box.run("sprite unpack-description", [
      "--description",
      DESCRIPTION,
      "--base",
      gamedata("textures"),
      "--output",
      box.at("selected"),
      "--file",
      "ui_test_sheet",
    ]);
  });

  it("should unpack every described file", () => {
    expect(all).toMatchSnapshot();
  });

  it("should unpack only the named file", () => {
    expect(selected).toMatchSnapshot();
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
