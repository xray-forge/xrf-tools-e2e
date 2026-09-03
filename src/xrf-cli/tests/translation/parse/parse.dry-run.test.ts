import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("translation parse previews without writing", () => {
  const box = new Sandbox(__filename);

  let dry: CliResult;

  beforeAll(() => {
    dry = box.run("translation parse", [
      "--path",
      resource("mod-text"),
      "--source",
      "directory",
      "--language",
      "eng",
      "--output",
      box.at("sources"),
      "--dry-run",
    ]);
  });

  // A dry run's whole result is what it would have written, which is the summary it just printed.
  it("should report what it would have written", () => {
    expect(dry).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
