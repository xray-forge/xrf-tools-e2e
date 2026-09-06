import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const HEIGHT = gamedata("textures/ui/ui_test_sheet.dds");

describe("dds make-bump gloss", () => {
  const box = new Sandbox(__filename);

  let dark: CliResult;
  let refused: CliResult;

  beforeAll(() => {
    dark = box.run("dds make-bump", [
      HEIGHT,
      box.at("matte"),
      "--gloss-constant",
      "0.05",
      "--quality",
      "fast",
      "--report",
      box.at("matte.json"),
    ]);

    refused = box.run("dds make-bump", [HEIGHT, box.at("invalid"), "--gloss-constant", "4"], { expectExit: 1 });
  });

  // The SDK answers -1000 for a gloss this dark and keeps the files it wrote, because a matte
  // surface is a thing somebody may have meant. A warning, then, not a failure.
  it("should warn about a gloss too dark and still write the pair", () => {
    expect(dark).toMatchSnapshot();
  });

  it("should report the verdict rather than failing on it", () => {
    expect(box.json("matte.json")).toMatchSnapshot();
  });

  it("should refuse a gloss outside the range a gloss is measured in", () => {
    expect(refused).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["matte.json"] })).toMatchSnapshot();
  });
});
