import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const SYSTEM_LTX = gamedata("configs/system.ltx");

/**
 * Two rectangles sharing a single cell without being identical, which is the shape the verifier
 * treats as a mistake.
 */
const PARTIAL_OVERLAP = [
  "[icon_a]",
  "$inventory_icon = true",
  "inv_grid_x = 0",
  "inv_grid_y = 0",
  "inv_grid_width = 2",
  "inv_grid_height = 2",
  "",
  "[icon_b]",
  "$inventory_icon = true",
  "inv_grid_x = 1",
  "inv_grid_y = 1",
  "inv_grid_width = 2",
  "inv_grid_height = 2",
  "",
].join("\n");

describe("sprite verify-equipment", () => {
  const box = new Sandbox(__filename);

  let verified: CliResult;
  let overlapping: CliResult;

  beforeAll(() => {
    verified = box.run("sprite verify-equipment", ["--system-ltx", SYSTEM_LTX]);

    // Kept out of the committed tree: a deliberately broken config there would also show up in
    // every other test that walks the configs directory.
    overlapping = box.run("sprite verify-equipment", ["--system-ltx", box.write("overlapping.ltx", PARTIAL_OVERLAP)], {
      expectExit: 3,
    });
  });

  // The committed sections include a pair sharing one slot exactly. Identical rects are legitimate
  // - variants such as _nimble and the quest copies do it - so a clean answer here is the point
  // rather than an accident.
  it("should accept a grid whose only sharing is identical", () => {
    expect(verified).toMatchSnapshot();
  });

  it("should reject a partial overlap", () => {
    expect(overlapping).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
