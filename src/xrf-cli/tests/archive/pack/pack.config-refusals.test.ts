import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack configuration refusals", () => {
  const box = new Sandbox(__filename);

  let unsupported: CliResult;

  beforeAll(() => {
    // The format is taken from the extension and never from the contents, so a valid configuration under a
    // name that spells no format is refused rather than read by the wrong reader.
    const misnamed = box.write("compress.txt", ["[options]", "exclude_exts = *.xml", ""].join("\n"));

    unsupported = box.run(
      "archive pack",
      ["--path", gamedata("configs"), "--dest", box.at("unsupported"), "--name", "cfg", "--config", misnamed],
      { expectExit: 1 }
    );
  });

  it("should refuse a configuration whose extension names no format", () => {
    expect(unsupported).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
