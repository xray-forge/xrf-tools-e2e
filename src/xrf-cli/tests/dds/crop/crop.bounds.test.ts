import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

// 256x64 DXT5.
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

describe("dds crop bounds", () => {
  const box = new Sandbox(__filename);

  let edge: CliResult;
  let outOfBounds: CliResult;
  let onePixelOverflow: CliResult;
  let sourceBefore: string;
  let destinationBefore: string;
  let destinationWasAbsent: boolean;

  beforeAll(() => {
    sourceBefore = sha(SHEET);

    edge = box.run("dds crop", [
      "--source",
      SHEET,
      "--output",
      box.at("edge.dds"),
      "--x",
      "192",
      "--y",
      "0",
      "--width",
      "64",
      "--height",
      "64",
      "--report",
      box.at("edge.json"),
    ]);

    outOfBounds = box.run(
      "dds crop",
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
    destinationWasAbsent = !fs.existsSync(box.at("never-written.dds"));

    box.copyIn(SHEET, "preserved.dds");
    destinationBefore = box.sha("preserved.dds");
    onePixelOverflow = box.run(
      "dds crop",
      [
        "--source",
        SHEET,
        "--output",
        box.at("preserved.dds"),
        "--x",
        "193",
        "--y",
        "0",
        "--width",
        "64",
        "--height",
        "64",
      ],
      { expectExit: 1 }
    );
  });

  it("should crop a region ending at the right edge", () => {
    expect(edge).toMatchSnapshot();
  });

  it("should report the exact-edge region and output dimensions", () => {
    expect(box.json("edge.json")).toMatchSnapshot();
    expect(box.json("edge.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        height: 64,
        regionHeight: 64,
        regionWidth: 64,
        regionX: 192,
        regionY: 0,
        width: 64,
      },
    });
  });

  it("should refuse a region that runs past the edge", () => {
    expect(outOfBounds).toMatchSnapshot();
  });

  it("should refuse a region that exceeds the edge by one pixel", () => {
    expect(onePixelOverflow).toMatchSnapshot();
  });

  it("should not create an absent output on refusal", () => {
    expect(destinationWasAbsent).toBe(true);
  });

  it("should preserve the source and an existing output on refusal", () => {
    expect(sha(SHEET)).toBe(sourceBefore);
    expect(box.sha("preserved.dds")).toBe(destinationBefore);
  });

  it("should write the edge crop and preserved output", () => {
    expect(box.manifest({ normalized: ["edge.json"] })).toMatchSnapshot();
  });
});
