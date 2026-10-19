import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

function icon(section: string, column: number): string {
  return [
    `[${section}]`,
    "$inventory_icon = true",
    `inv_grid_x = ${column}`,
    "inv_grid_y = 0",
    "inv_grid_width = 1",
    "inv_grid_height = 1",
    "",
  ].join("\n");
}

describe("sprite unpack-equipment escaping section names", () => {
  const box = new Sandbox(__filename);

  // A section name names the icon file it is cut into, so each of these would land on `victim.dds` beside the outputs.
  const sections: Array<string> = ["../victim", "..\\victim", "c:victim"];
  const results: Array<CliResult> = [];

  beforeAll(() => {
    box.write("victim.dds", "sentinel");

    for (const [index, section] of sections.entries()) {
      // A valid icon comes first, so a run that wrote before it checked would leave it behind.
      const systemLtx: string = box.write(`configs/escape-${index}.ltx`, icon("wpn_valid", 0) + icon(section, 1));

      results.push(
        box.run(
          "sprite unpack-equipment",
          ["--system-ltx", systemLtx, "--source", SHEET, "--output", box.at(`out-${index}`)],
          { expectExit: 1 }
        )
      );
    }
  });

  it("should refuse every section name that leaves the output directory", () => {
    expect(results).toMatchSnapshot();
  });

  it("should leave the file each name aimed at untouched", () => {
    expect(fs.readFileSync(box.at("victim.dds"), "utf8")).toBe("sentinel");
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
