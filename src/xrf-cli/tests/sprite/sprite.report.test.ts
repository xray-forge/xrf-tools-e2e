import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox } from "#/test/sandbox";

const SYSTEM_LTX = gamedata("configs/system.ltx");
// 256x64 DXT5.
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

/**
 * What the sprite commands report to a machine.
 */
describe("sprite reports", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("sprite unpack-equipment", [
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
    box.run("sprite pack-equipment", [
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
    box.run("sprite verify-equipment", [
      "--system-ltx",
      SYSTEM_LTX,
      "--silent",
      "--report",
      box.at("verify-icons.json"),
    ]);
  });

  it("should report what slicing the sprite produced", () => {
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
