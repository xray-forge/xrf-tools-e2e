import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What a set file may not say, and what happens when it says it anyway.
 *
 * A set owns its own syntax, so it is read strictly where a plain xrCompress configuration is read leniently: a
 * suffixed section names a target and therefore has to name a section a target has, and an option key it does not
 * know is a typo that would pack a different archive in silence. The overlap refusal is the one decided after the
 * walk rather than while reading, which is why the manifest is the assertion that matters there — every target had
 * been collected and none of them was written.
 */
describe("archive pack set refusals", () => {
  const box = new Sandbox(__filename);

  let overlapping: CliResult;
  let emptySelection: CliResult;
  let unknownBase: CliResult;
  let inherited: CliResult;
  let defaultSelection: CliResult;
  let unknownOptionKey: CliResult;

  beforeAll(() => {
    // A directory and a directory below it: nothing about the two selections looks alike, and both claim the same
    // engine name, which only the full walk can tell.
    const overlap: string = box.write(
      "overlap.ltx",
      ["[include_folders.whole]", "configs = true", "", "[include_folders.part]", "configs\\misc = true", ""].join("\n")
    );

    overlapping = box.run("archive pack", [gamedata(), "--dest", box.at("overlap"), "--config", overlap], {
      expectExit: 1,
    });

    // Alone an empty selection means the whole tree, so inside a set it would claim every other target's files.
    const empty: string = box.write(
      "empty.ltx",
      ["[include_folders.configs]", "configs = true", "", "[include_folders.meshes]", ""].join("\n")
    );

    emptySelection = box.run("archive pack", [gamedata(), "--dest", box.at("empty"), "--config", empty], {
      expectExit: 1,
    });

    // Once a file is a set every dotted section claims to belong to a target, so one whose base names no section of a
    // target is refused rather than ignored as somebody else's.
    const unknown: string = box.write(
      "unknown-base.ltx",
      ["[include_folders.configs]", "configs = true", "", "[compression.configs]", "level = 9", ""].join("\n")
    );

    unknownBase = box.run("archive pack", [gamedata(), "--dest", box.at("unknown-base"), "--config", unknown], {
      expectExit: 1,
    });

    // The LTX reader unions an inherited section in while a set replaces one whole, so the two readings are never
    // allowed to disagree in silence.
    const inheriting: string = box.write(
      "inherited.ltx",
      [
        "[include_folders.configs]",
        "configs = true",
        "",
        "[include_folders.meshes]:include_folders.configs",
        "meshes = true",
        "",
      ].join("\n")
    );

    inherited = box.run("archive pack", [gamedata(), "--dest", box.at("inherited"), "--config", inheriting], {
      expectExit: 1,
    });

    // An unsuffixed selection has no target to belong to, and every target of the set would claim it at once.
    const shared: string = box.write(
      "default-selection.ltx",
      ["[include_folders]", "configs = true", "", "[include_folders.meshes]", "meshes = true", ""].join("\n")
    );

    defaultSelection = box.run(
      "archive pack",
      [gamedata(), "--dest", box.at("default-selection"), "--config", shared],
      { expectExit: 1 }
    );

    const mistyped: string = box.write(
      "unknown-key.ltx",
      [
        "[options.configs]",
        "compression = fast",
        "",
        "[include_folders.configs]",
        "configs = true",
        "",
        "[include_folders.meshes]",
        "meshes = true",
        "",
      ].join("\n")
    );

    unknownOptionKey = box.run("archive pack", [gamedata(), "--dest", box.at("unknown-key"), "--config", mistyped], {
      expectExit: 1,
    });
  });

  it("should refuse two targets claiming one file", () => {
    expect(overlapping).toMatchSnapshot();
    expect(overlapping.stderr.join("\n")).toContain("configs\\misc\\inventory_icons.ltx");
  });

  it("should refuse a target selecting nothing beside another", () => {
    expect(emptySelection).toMatchSnapshot();
  });

  it("should refuse a suffixed section whose base names no section of a target", () => {
    expect(unknownBase).toMatchSnapshot();
  });

  it("should refuse a section declaring inheritance", () => {
    expect(inherited).toMatchSnapshot();
  });

  it("should refuse a default selection beside suffixed sections", () => {
    expect(defaultSelection).toMatchSnapshot();
  });

  it("should refuse an unknown key in a target's options", () => {
    expect(unknownOptionKey).toMatchSnapshot();
  });

  // Every refusal above stops before a byte is published, which nothing but the manifest can say.
  it("should write nothing but the configurations the test authored", () => {
    expect(box.manifest()).toMatchSnapshot();
    expect(box.manifest().every((file) => file.path.endsWith(".ltx"))).toBe(true);
  });
});
