import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

describe("dds convert comparison", () => {
  const box = new Sandbox(__filename);

  let compared: CliResult;

  beforeAll(() => {
    compared = box.run("dds convert", [
      SHEET,
      box.at("compared.dds"),
      "--format",
      "bc3",
      "--quality",
      "fast",
      "--compare",
      "--report",
      box.at("compared.json"),
    ]);
  });

  it("should convert while weighing the alternatives", () => {
    expect(compared).toMatchSnapshot();
  });

  it("should report every candidate against the same levels", () => {
    expect(box.json("compared.json")).toMatchSnapshot();
  });

  // Four alternatives, and the written one is not among them: a format reported twice would make a
  // comparison table read as if one candidate were two.
  it("should weigh the four formats it did not write", () => {
    const { candidates } = (box.json("compared.json") as { result: { candidates: Array<{ format: string }> } }).result;

    expect(candidates).toHaveLength(4);
    expect(candidates.map((it) => it.format)).not.toContain("BC3 (DXT5)");
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["compared.json"] })).toMatchSnapshot();
  });
});
