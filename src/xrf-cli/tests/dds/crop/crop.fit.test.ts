import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

// 256x64 DXT5.
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

describe("dds crop fit", () => {
  const box = new Sandbox(__filename);

  let fitted: CliResult;
  let fittedInfo: CliResult;

  beforeAll(() => {
    fitted = box.run("dds crop", [
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

    fittedInfo = box.run("dds info", ["--path", box.at("fitted.dds")]);
  });

  it("should scale a cropped region to fit", () => {
    expect(fitted).toMatchSnapshot();
  });

  it("should report the fitted dimensions", () => {
    expect(fittedInfo).toMatchSnapshot();
  });

  it("should write the expected file", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
