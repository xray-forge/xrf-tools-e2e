import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("translation format line endings", () => {
  const box = new Sandbox(__filename);

  let assertedEndings: CliResult;

  beforeAll(() => {
    const sources = box.copyIn(resource("translations"), "translations");

    // Line endings are unjudged unless asserted; asserting the spelling the files do not use arms the check.
    box.run("translation format", ["--path", sources]);
    assertedEndings = box.run("translation format", ["--path", sources, "--check", "--line-endings", "crlf"], {
      expectExit: 3,
    });
  });

  it("should preserve the fixture's LF endings while formatting", () => {
    for (const source of ["translations/st_items.json", "translations/st_ui.json"]) {
      const bytes = fs.readFileSync(box.at(source));

      expect(bytes.includes(13)).toBe(false);
      expect(bytes.at(-1)).toBe(10);
    }
  });

  it("should judge line endings only when they are asserted", () => {
    expect(assertedEndings).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
