import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

// 256x64 DXT5, used here as relief rather than as a picture: a height map is whatever an author paints.
const HEIGHT = gamedata("textures/ui/ui_test_sheet.dds");

describe("dds make-bump pair", () => {
  const box = new Sandbox(__filename);

  let generated: CliResult;
  let bumpInfo: CliResult;
  let companionInfo: CliResult;

  beforeAll(() => {
    generated = box.run("dds make-bump", [
      HEIGHT,
      box.at("wall"),
      "--gloss-constant",
      "0.6",
      "--quality",
      "fast",
      "--report",
      box.at("bump.json"),
    ]);

    bumpInfo = box.run("dds info", ["--path", box.at("wall_bump.dds")]);
    companionInfo = box.run("dds info", ["--path", box.at("wall_bump#.dds")]);
  });

  it("should generate the pair", () => {
    expect(generated).toMatchSnapshot();
  });

  it("should report both halves and the gloss", () => {
    expect(box.json("bump.json")).toMatchSnapshot();
  });

  it("should write both halves as DXT5 with a chain", () => {
    expect(bumpInfo).toMatchSnapshot();
    expect(companionInfo).toMatchSnapshot();
  });

  // The two halves carry different planes of the same structure. Identical bytes would mean one of
  // them was written twice, which no assertion about either alone would catch.
  it("should write two different halves", () => {
    expect(box.sha("wall_bump.dds")).not.toBe(box.sha("wall_bump#.dds"));
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["bump.json"] })).toMatchSnapshot();
  });
});
