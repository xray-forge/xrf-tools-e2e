import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack direct configuration", () => {
  const box = new Sandbox(__filename);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let viaConfig: CliResult;
  let viaArguments: CliResult;
  let conflicting: CliResult;
  let malformedHeader: CliResult;

  beforeAll(() => {
    const config = box.write(
      "compress.ltx",
      [
        "[options]",
        "exclude_exts = *.xml",
        "",
        "[include_folders]",
        "misc = true",
        "",
        "[header]",
        "auto_load = true",
        "entry_point = $fs_root$gamedata\\",
        "",
      ].join("\n")
    );

    viaConfig = box.run("archive pack", [
      "--path",
      gamedata("configs"),
      "--dest",
      box.at("via-config"),
      "--name",
      "cfg",
      "--config",
      config,
    ]);

    // The same selection named on the command line, which is how `xrf-engine` compresses without writing a file.
    viaArguments = box.run("archive pack", [
      "--path",
      gamedata("configs"),
      "--dest",
      box.at("via-arguments"),
      "--name",
      "cfg",
      "--include-directory",
      "misc",
      "--exclude-extension",
      "*.xml",
      "--header",
      "auto_load=true",
      "--header",
      "entry_point=$fs_root$gamedata\\",
    ]);

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

  it("should pack from options alone", () => {
    expect(viaArguments).toMatchSnapshot();
  });

  // One payload in three spellings has to select one archive, which identical bytes are the only proof of.
  it("should produce the same archive as the equivalent configuration file", () => {
    expect(box.sha("via-arguments/cfg.db")).toBe(box.sha("via-config/cfg.db"));
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
