import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

const DESCRIPTION = gamedata("configs/ui/textures_descr/ui_test_sheet.xml");
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

describe("texture description roundtrip", () => {
  const box = new Sandbox(__filename);

  let unpack: CliResult;
  let pack: CliResult;
  let info: CliResult;

  beforeAll(() => {
    // The description names four 64x64 regions of a 256x64 sheet, so unpacking yields four files
    // under the sheet's own directory.
    unpack = box.run("texture unpack-texture-description", [
      "--description",
      DESCRIPTION,
      "--base",
      gamedata("textures"),
      "--output",
      box.at("unpacked"),
    ]);

    // The description names the sheet under ui/, so packing must create that output subdirectory.
    pack = box.run("texture pack-texture-description", [
      "--description",
      DESCRIPTION,
      "--base",
      box.at("unpacked"),
      "--output",
      box.at("packed"),
    ]);

    info = box.run("texture info-dds", ["--path", box.at("packed/ui/ui_test_sheet.dds")]);
  });

  it("should unpack every described region", () => {
    expect(unpack).toMatchSnapshot();
  });

  it("should pack the regions back into a sheet", () => {
    expect(pack).toMatchSnapshot();
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
