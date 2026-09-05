import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

// 256x64 DXT5.
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

describe("dds crop regions", () => {
  const box = new Sandbox(__filename);

  let corner: CliResult;
  let offset: CliResult;
  let cornerInfo: CliResult;

  beforeAll(() => {
    corner = box.run("dds crop", [
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
      "--report",
      box.at("crop.json"),
    ]);

    offset = box.run("dds crop", [
      "--source",
      SHEET,
      "--output",
      box.at("offset.dds"),
      "--x",
      "64",
      "--y",
      "0",
      "--width",
      "64",
      "--height",
      "64",
    ]);

    cornerInfo = box.run("dds info", ["--path", box.at("corner.dds")]);
  });

  it("should crop the top left region", () => {
    expect(corner).toMatchSnapshot();
  });

  it("should crop an offset region", () => {
    expect(offset).toMatchSnapshot();
  });

  // Two different regions of the same sheet must not come out identical, or the crop ignored its
  // offset.
  it("should take different regions from different offsets", () => {
    expect(box.sha("offset.dds")).not.toBe(box.sha("corner.dds"));
  });

  it("should report the cropped dimensions", () => {
    expect(cornerInfo).toMatchSnapshot();
  });

  it("should report the region a crop produced", () => {
    expect(box.json("crop.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["crop.json"] })).toMatchSnapshot();
  });
});
