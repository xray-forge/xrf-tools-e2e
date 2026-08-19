import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

/**
 * A section may point at its own icon with `$inventory_icon_path` instead of taking
 * `<source>/<section>.dds`. That path is resolved against `<gamedata>/textures/`, so without
 * `--gamedata` there is nothing to resolve it against and the section is skipped. The path carries
 * its own extension: unlike the default, nothing is appended to it.
 *
 * Written here rather than added to the committed configs, because a section with a custom icon
 * path would change what every other test walking that tree sees.
 */
const CUSTOM_SECTIONS = [
  "[test_icon_a]",
  "$inventory_icon = true",
  "inv_grid_x = 0",
  "inv_grid_y = 0",
  "inv_grid_width = 1",
  "inv_grid_height = 1",
  "",
  "[test_icon_custom]",
  "$inventory_icon = true",
  "$inventory_icon_path = ui\\ui_test_sheet.dds",
  "inv_grid_x = 1",
  "inv_grid_y = 0",
  "inv_grid_width = 1",
  "inv_grid_height = 1",
  "",
].join("\n");

describe("pack-equipment-icons gamedata resolution", () => {
  const box = new Sandbox(__filename);

  let withGamedata: CliResult;
  let withoutGamedata: CliResult;

  beforeAll(() => {
    // Unpacking supplies the ordinary icon; only the custom section needs the gamedata tree.
    box.run("unpack-equipment-icons", [
      "--system-ltx",
      gamedata("configs/system.ltx"),
      "--source",
      gamedata("textures/ui/ui_test_sheet.dds"),
      "--output",
      box.at("icons"),
    ]);

    const config = box.write("custom.ltx", CUSTOM_SECTIONS);

    withGamedata = box.run("pack-equipment-icons", [
      "--system-ltx",
      config,
      "--source",
      box.at("icons"),
      "--output",
      box.at("with-gamedata.dds"),
      "--gamedata",
      gamedata(),
    ]);

    withoutGamedata = box.run("pack-equipment-icons", [
      "--system-ltx",
      config,
      "--source",
      box.at("icons"),
      "--output",
      box.at("without-gamedata.dds"),
    ]);
  });

  // Two icons: the ordinary one from the source directory, and the custom one resolved out of the
  // gamedata textures tree.
  it("should resolve a custom icon path from the gamedata tree", () => {
    expect(withGamedata).toMatchSnapshot();
  });

  // One icon: the custom path has nothing to resolve against and its section is skipped.
  it("should skip a custom icon path without a gamedata tree", () => {
    expect(withoutGamedata).toMatchSnapshot();
  });

  // Packing one icon instead of two has to change the sheet, which is what proves the flag did
  // something rather than being accepted and ignored.
  it("should produce a different sheet with and without the tree", () => {
    expect(box.sha("with-gamedata.dds")).not.toBe(box.sha("without-gamedata.dds"));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
