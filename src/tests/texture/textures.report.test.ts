import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox } from "#/test/sandbox";

const SYSTEM_LTX = gamedata("configs/system.ltx");
// 256x64 DXT5.
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

/**
 * What the texture commands report to a machine.
 */
describe("texture reports", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("texture crop-dds", [
      "--source",
      SHEET,
      "--output",
      box.at("corner.dds"),
      "--x",
      "0",
      "--y",
      "0",
      "--width",
      "64",
      "--height",
      "64",
      "--silent",
      "--report",
      box.at("crop.json"),
    ]);
    box.run("texture unpack-equipment-icons", [
      "--system-ltx",
      SYSTEM_LTX,
      "--source",
      SHEET,
      "--output",
      box.at("icons"),
      "--silent",
      "--report",
      box.at("unpack-icons.json"),
    ]);
    box.run("texture pack-equipment-icons", [
      "--system-ltx",
      SYSTEM_LTX,
      "--source",
      box.at("icons"),
      "--output",
      box.at("repacked.dds"),
      "--silent",
      "--report",
      box.at("pack-icons.json"),
    ]);
    box.run("texture verify-equipment-icons", [
      "--system-ltx",
      SYSTEM_LTX,
      "--silent",
      "--report",
      box.at("verify-icons.json"),
    ]);
  });

  it("should report the region a crop produced", () => {
    expect(box.json("crop.json")).toMatchSnapshot();
  });

  it("should report what slicing the sheet produced", () => {
    expect(box.json("unpack-icons.json")).toMatchSnapshot();
  });

  it("should report what packing the icons produced", () => {
    expect(box.json("pack-icons.json")).toMatchSnapshot();
  });

  // The grid check passes on this tree, so the verdict is the whole answer. A failing run's findings
  // are what a caller reads instead, and reach `result` the same way.
  it("should report the verdict on the icon grid", () => {
    expect(box.json("verify-icons.json")).toMatchSnapshot();
  });
});
