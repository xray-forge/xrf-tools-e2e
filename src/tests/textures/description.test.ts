import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

const DESCRIPTION = gamedata("configs/ui/textures_descr/ui_test_sheet.xml");
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

describe("texture description pack and unpack", () => {
  const box = new Sandbox(__filename);

  let unpack: CliResult;
  let pack: CliResult;
  let missingOutput: CliResult;
  let selected: CliResult;
  let unknownFile: CliResult;

  beforeAll(() => {
    // The description names four 64x64 regions of a 256x64 sheet, so unpacking yields four files
    // under the sheet's own directory.
    unpack = box.run("unpack-texture-description", [
      "--description",
      DESCRIPTION,
      "--base",
      gamedata("textures"),
      "--output",
      box.at("unpacked"),
    ]);

    // Packing does not create the directory it writes into: the sheet lands at <output>/ui/, and
    // without that subdirectory the command fails on a bare OS error. Creating it here is what the
    // caller has to do, and the test below records the failure when they do not.
    missingOutput = box.run(
      "pack-texture-description",
      ["--description", DESCRIPTION, "--base", box.at("unpacked"), "--output", box.at("no-subdir")],
      { expectExit: 1 }
    );

    box.write("packed/ui/.keep", "");
    pack = box.run("pack-texture-description", [
      "--description",
      DESCRIPTION,
      "--base",
      box.at("unpacked"),
      "--output",
      box.at("packed"),
    ]);

    // Naming a described file limits the run to it, and doing the work in parallel must not change
    // what comes out.
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
    unknownFile = box.run(
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

  it("should unpack every described region", () => {
    expect(unpack).toMatchSnapshot();
  });

  it("should pack the regions back into a sheet", () => {
    expect(pack).toMatchSnapshot();
  });

  // Recorded as current behaviour rather than accepted as correct: every other writer in the CLI
  // creates the tree it writes into.
  it("should fail when the output subdirectory does not exist", () => {
    expect(missingOutput).toMatchSnapshot();
  });

  // The sheet is re-encoded rather than reassembled from the original blocks, so the roundtrip is
  // lossy at the byte level even though every region is the right size and position.
  it("should not reproduce the sheet byte for byte", () => {
    expect(box.sha("packed/ui/ui_test_sheet.dds")).not.toBe(sha(SHEET));
  });

  it("should describe the repacked sheet the same way", () => {
    expect(box.run("info-dds", ["--path", box.at("packed/ui/ui_test_sheet.dds")])).toMatchSnapshot();
  });

  it("should unpack only the named file, in parallel", () => {
    expect(selected).toMatchSnapshot();
  });

  it("should refuse a name the description does not carry", () => {
    expect(unknownFile).toMatchSnapshot();
  });

  // Selecting the only described file and unpacking everything have to agree, or --file changes
  // more than which files are considered.
  it("should produce the same regions whether selected or not", () => {
    expect(box.sha("selected/ui/ui_test_sheet/ui_test_left.dds")).toBe(
      box.sha("unpacked/ui/ui_test_sheet/ui_test_left.dds")
    );
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
