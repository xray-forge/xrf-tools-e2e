import { beforeAll, describe, expect, it } from "@jest/globals";

import type { Nullable } from "#/types";
import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

// 256x64 DXT5.
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

describe("dds convert formats", () => {
  const box = new Sandbox(__filename);

  let compressed: CliResult;
  let uncompressed: CliResult;
  let flat: CliResult;
  let compressedInfo: CliResult;

  beforeAll(() => {
    compressed = box.run("dds convert", [
      SHEET,
      box.at("bc1.dds"),
      "--format",
      "bc1",
      "--quality",
      "fast",
      "--report",
      box.at("bc1.json"),
    ]);

    uncompressed = box.run("dds convert", [
      SHEET,
      box.at("rgba8.dds"),
      "--format",
      "rgba8",
      "--quality",
      "fast",
      "--report",
      box.at("rgba8.json"),
    ]);

    flat = box.run("dds convert", [SHEET, box.at("flat.dds"), "--format", "bc3", "--quality", "fast", "--no-mipmaps"]);

    compressedInfo = box.run("dds info", ["--path", box.at("bc1.dds")]);
  });

  it("should convert into a block format", () => {
    expect(compressed).toMatchSnapshot();
  });

  it("should convert into an uncompressed format", () => {
    expect(uncompressed).toMatchSnapshot();
  });

  it("should write only the base level when a chain is refused", () => {
    expect(flat).toMatchSnapshot();
  });

  it("should report what the format cost", () => {
    expect(box.json("bc1.json")).toMatchSnapshot();
  });

  // The whole point of choosing a format: the block one is smaller, and the uncompressed one loses
  // nothing. A report that said otherwise would make the choice meaningless.
  it("should price an uncompressed conversion above a compressed one", () => {
    const written = (relative: string): { format: string; gpuBytes: number; psnr: Nullable<number> } =>
      (box.json(relative) as { result: { written: { format: string; gpuBytes: number; psnr: Nullable<number> } } })
        .result.written;

    expect(written("bc1.json")).toMatchObject({ format: "BC1 (DXT1)" });
    expect(written("rgba8.json")).toMatchObject({ format: "RGBA8", psnr: null });

    // A 256x64 sheet reduces nine times, 21,847 pixels in all, so uncompressed it is 87,388 bytes.
    // BC1 is not an eighth of that but 10,952: it spends eight bytes on each 4x4 block, and the last
    // four levels are smaller than one block and still pay for a whole one.
    expect(written("rgba8.json").gpuBytes).toBe(21_847 * 4);
    expect(written("bc1.json").gpuBytes).toBe(1_369 * 8);
  });

  it("should describe the converted texture", () => {
    expect(compressedInfo).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["bc1.json", "rgba8.json"] })).toMatchSnapshot();
  });
});
