import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

const DESCRIPTION = gamedata("configs/ui/textures_descr/ui_test_sheet.xml");
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

describe("texture description roundtrip", () => {
  const box = new Sandbox(__filename);

  let unpack: CliResult;
  let pack: CliResult;
  let missingOutput: CliResult;
  let info: CliResult;

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

    info = box.run("info-dds", ["--path", box.at("packed/ui/ui_test_sheet.dds")]);
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
    expect(info).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
