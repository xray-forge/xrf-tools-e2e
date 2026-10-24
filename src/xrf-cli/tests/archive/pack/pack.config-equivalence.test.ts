import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack configuration equivalence", () => {
  const box = new Sandbox(__filename);

  let configured: CliResult;
  let configuredJson: CliResult;
  let viaConfig: CliResult;
  let viaArguments: CliResult;

  beforeAll(() => {
    // A packing configuration narrows what is packed: this one drops xml by extension and the misc
    // directory by name, so the configs tree packs one file short of its full contents.
    const config = box.write(
      "compress.ltx",
      ["[options]", "exclude_exts = *.xml", "", "[exclude_folders]", "misc", ""].join("\n")
    );

    // The same payload in the other serialization. Both are read through `--config`, chosen by extension.
    const configJson = box.write(
      "compress.json",
      JSON.stringify(
        {
          excludeExtensions: ["*.xml"],
          excludeDirectories: [{ path: "misc", isRecursive: false }],
        },
        null,
        2
      )
    );

    configured = box.run("archive pack", [
      "--path",
      gamedata("configs"),
      "--dest",
      box.at("configured"),
      "--name",
      "cfg",
      "--config",
      config,
    ]);

    configuredJson = box.run("archive pack", [
      "--path",
      gamedata("configs"),
      "--dest",
      box.at("configured-json"),
      "--name",
      "cfg",
      "--config",
      configJson,
    ]);

    const directConfig = box.write(
      "direct.ltx",
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
      directConfig,
    ]);
    // The same selection named on the command line, which is how xrf-engine compresses without writing a file.
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
  });

  it("should honour an xrCompress configuration", () => {
    expect(configured).toMatchSnapshot();
  });

  it("should honour the same configuration written as a document", () => {
    expect(configuredJson).toMatchSnapshot();
  });

  // Two serializations of one payload have to select the same files, which is what an identical archive proves.
  it("should produce the same archive from either format", () => {
    expect(box.sha("configured-json/cfg.db")).toBe(box.sha("configured/cfg.db"));
  });

  it("should pack from direct options alone", () => {
    expect(viaConfig).toMatchSnapshot();
    expect(viaArguments).toMatchSnapshot();
  });

  // The two selection spellings must select one archive, which identical bytes are the only proof of.
  it("should produce the same archive from direct arguments as from the equivalent configuration", () => {
    expect(box.sha("via-arguments/cfg.db")).toBe(box.sha("via-config/cfg.db"));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
