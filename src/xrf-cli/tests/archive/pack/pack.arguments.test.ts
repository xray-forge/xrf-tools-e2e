import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack arguments", () => {
  const box = new Sandbox(__filename);

  let conflicting: CliResult;
  let malformedHeader: CliResult;

  beforeAll(() => {
    const config = box.write("compress.ltx", ["[include_folders]", "misc = true", ""].join("\n"));

    // Two sources for one selection would need a precedence rule, so the parser refuses instead of inventing one.
    conflicting = box.run(
      "archive pack",
      [
        "--path",
        gamedata("configs"),
        "--dest",
        box.at("conflicting"),
        "--name",
        "cfg",
        "--config",
        config,
        "--include-directory",
        "misc",
      ],
      { expectExit: 2 }
    );

    malformedHeader = box.run(
      "archive pack",
      ["--path", gamedata("configs"), "--dest", box.at("malformed-header"), "--name", "cfg", "--header", "auto_load"],
      { expectExit: 1 }
    );
  });

  it("should refuse a configuration file beside a direct selection", () => {
    expect(conflicting).toMatchSnapshot();
  });

  it("should refuse a header entry that names no key", () => {
    expect(malformedHeader).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
