import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const SYSTEM_LTX = gamedata("configs/system.ltx");
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

/**
 * Two rectangles sharing a single cell without being identical, which is the shape the verifier
 * treats as a mistake.
 */
const PARTIAL_OVERLAP = [
  "[icon_a]",
  "$inventory_icon = true",
  "inv_grid_x = 0",
  "inv_grid_y = 0",
  "inv_grid_width = 2",
  "inv_grid_height = 2",
  "",
  "[icon_b]",
  "$inventory_icon = true",
  "inv_grid_x = 1",
  "inv_grid_y = 1",
  "inv_grid_width = 2",
  "inv_grid_height = 2",
  "",
].join("\n");

describe("equipment icons", () => {
  const box = new Sandbox(__filename);

  let verified: CliResult;
  let overlapping: CliResult;
  let unpacked: CliResult;
  let packed: CliResult;

  beforeAll(() => {
    verified = box.run("verify-equipment-icons", ["--system-ltx", SYSTEM_LTX]);

    // Kept out of the committed tree: a deliberately broken config there would also show up in
    // every other test that walks the configs directory.
    overlapping = box.run("verify-equipment-icons", ["--system-ltx", box.write("overlapping.ltx", PARTIAL_OVERLAP)], {
      expectExit: 1,
    });

    unpacked = box.run("unpack-equipment-icons", [
      "--system-ltx",
      SYSTEM_LTX,
      "--source",
      SHEET,
      "--output",
      box.at("icons"),
    ]);

    packed = box.run("pack-equipment-icons", [
      "--system-ltx",
      SYSTEM_LTX,
      "--source",
      box.at("icons"),
      "--output",
      box.at("repacked.dds"),
    ]);
  });

  // The committed sections include a pair sharing one slot exactly. Identical rects are legitimate,
  // so a clean answer here is the point rather than an accident.
  it("should accept a grid whose only sharing is identical", () => {
    expect(verified).toMatchSnapshot();
  });

  it("should reject a partial overlap", () => {
    expect(overlapping).toMatchSnapshot();
  });

  // Only the opted-in sections are cut, so the section carrying $inventory_icon = false produces no
  // file even though its grid fields are complete.
  it("should unpack only the opted-in icons", () => {
    expect(unpacked).toMatchSnapshot();
  });

  it("should pack the icons back into a sheet", () => {
    expect(packed).toMatchSnapshot();
  });

  it("should describe the packed sheet", () => {
    expect(box.run("info-dds", ["--path", box.at("repacked.dds")])).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
