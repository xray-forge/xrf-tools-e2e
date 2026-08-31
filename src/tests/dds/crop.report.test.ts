import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox } from "#/test/sandbox";

// 256x64 DXT5.
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

/**
 * What `dds crop` reports to a machine.
 */
describe("dds crop reports", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("dds crop", [
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
  });

  it("should report the region a crop produced", () => {
    expect(box.json("crop.json")).toMatchSnapshot();
  });
});
