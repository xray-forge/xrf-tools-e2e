import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("sprite unpack-description escaping sprite ids", () => {
  const box = new Sandbox(__filename);

  // A sprite id names the file it is cut into, so each of these would land on `victim.dds` beside the outputs: a
  // parent climb in either separator, a drive, and a whole path.
  const ids: Array<string> = ["../../../victim", "..\\..\\..\\victim", "c:victim", box.at("victim")];
  const results: Array<CliResult> = [];

  beforeAll(() => {
    box.write("victim.dds", "sentinel");

    for (const [index, id] of ids.entries()) {
      // A valid sprite comes first, so a run that wrote before it checked would leave it behind.
      const description: string = box.write(
        `descriptions/escape-${index}.xml`,
        [
          "<w>",
          '  <file name="ui\\ui_test_sheet">',
          '    <texture id="ui_test_left" x="0" y="0" width="64" height="64" />',
          `    <texture id="${id}" x="64" y="0" width="64" height="64" />`,
          "  </file>",
          "</w>",
          "",
        ].join("\n")
      );

      results.push(
        box.run(
          "sprite unpack-description",
          ["--description", description, "--base", gamedata("textures"), "--dest", box.at(`out-${index}`)],
          { expectExit: 1 }
        )
      );
    }
  });

  it("should refuse every id that leaves the output directory", () => {
    expect(results).toMatchSnapshot();
  });

  it("should leave the file each id aimed at untouched", () => {
    expect(fs.readFileSync(box.at("victim.dds"), "utf8")).toBe("sentinel");
  });

  it("should write the expected files", () => {
    // The last description names the sandbox's own path, which differs between checkouts.
    expect(box.manifest({ normalized: ["descriptions/escape-3.xml"] })).toMatchSnapshot();
  });
});
