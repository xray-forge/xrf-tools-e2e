import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

// 256x64 DXT5.
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

describe("texture crop-dds", () => {
  const box = new Sandbox(__filename);

  let corner: CliResult;
  let offset: CliResult;
  let fitted: CliResult;
  let outOfBounds: CliResult;

  beforeAll(() => {
    corner = box.run("texture crop-dds", [
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
    ]);

    offset = box.run("texture crop-dds", [
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

    // Scaling letterboxes the region rather than stretching it, so the aspect survives.
    fitted = box.run("texture crop-dds", [
      "--source",
      SHEET,
      "--output",
      box.at("fitted.dds"),
      "--x",
      "0",
      "--y",
      "0",
      "--width",
      "64",
      "--height",
      "64",
      "--fit-width",
      "32",
      "--fit-height",
      "32",
    ]);

    outOfBounds = box.run(
      "texture crop-dds",
      [
        "--source",
        SHEET,
        "--output",
        box.at("never-written.dds"),
        "--x",
        "192",
        "--y",
        "0",
        "--width",
        "128",
        "--height",
        "64",
      ],
      { expectExit: 1 }
    );
  });

  it("should crop the top left region", () => {
    expect(corner).toMatchSnapshot();
  });

  it("should crop an offset region", () => {
    expect(offset).toMatchSnapshot();
  });

  it("should scale a cropped region to fit", () => {
    expect(fitted).toMatchSnapshot();
  });

  it("should refuse a region that runs past the edge", () => {
    expect(outOfBounds).toMatchSnapshot();
  });

  // Two different regions of the same sheet must not come out identical, or the crop ignored its
  // offset.
  it("should take different regions from different offsets", () => {
    expect(box.sha("offset.dds")).not.toBe(box.sha("corner.dds"));
  });

  it("should report the cropped dimensions", () => {
    expect(box.run("texture info-dds", ["--path", box.at("corner.dds")])).toMatchSnapshot();
  });

  it("should report the fitted dimensions", () => {
    expect(box.run("texture info-dds", ["--path", box.at("fitted.dds")])).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
