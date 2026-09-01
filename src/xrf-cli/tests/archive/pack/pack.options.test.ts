import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("archive pack options", () => {
  const box = new Sandbox(__filename);

  let stored: CliResult;
  let skipped: CliResult;
  let kept: CliResult;
  let configured: CliResult;

  beforeAll(() => {
    stored = box.run("archive pack", [
      "--path",
      gamedata("configs"),
      "--dest",
      box.at("stored"),
      "--name",
      "cfg",
      "--xdb",
      "--store",
    ]);

    // readme.txt is on the built-in skip list of editor and source leftovers.
    const source = box.copyIn(gamedata("configs"), "source");

    box.write("source/readme.txt", "leftover\n");

    skipped = box.run("archive pack", ["--path", source, "--dest", box.at("skipped"), "--name", "a"]);
    kept = box.run("archive pack", ["--path", source, "--dest", box.at("kept"), "--name", "a", "--no-skip-list"]);

    // An xrCompress configuration narrows what is packed: this one drops xml by extension and the
    // misc directory by name, so the configs tree packs one file short of its full contents.
    const config = box.write(
      "compress.ltx",
      ["[options]", "exclude_exts = *.xml", "", "[exclude_folders]", "misc", ""].join("\n")
    );

    configured = box.run("archive pack", [
      "--path",
      gamedata("configs"),
      "--dest",
      box.at("configured"),
      "--name",
      "cfg",
      "--ltx",
      config,
    ]);
  });

  it("should store instead of compressing and write an xdb", () => {
    expect(stored).toMatchSnapshot();
  });

  it("should skip editor leftovers by default", () => {
    expect(skipped).toMatchSnapshot();
  });

  it("should keep them when the skip list is off", () => {
    expect(kept).toMatchSnapshot();
  });

  // Keeping one more file has to change the archive, which is what proves the flag did something
  // rather than being accepted and ignored.
  it("should produce a different archive with the skip list off", () => {
    expect(box.sha("kept/a.db")).not.toBe(box.sha("skipped/a.db"));
  });

  it("should honour an xrCompress configuration", () => {
    expect(configured).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
