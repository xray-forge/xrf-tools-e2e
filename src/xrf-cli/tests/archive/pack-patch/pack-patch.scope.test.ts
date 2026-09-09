import { beforeAll, describe, expect, it } from "@jest/globals";

import { EDITED_SYSTEM_LTX, createWorld, type WorldEdit } from "#/xrf-cli/test/patch-worlds";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/** A change inside `configs` and one outside it, so a scope has something to include and something to drop. */
const TARGET_EDITS: Array<WorldEdit> = [
  { content: EDITED_SYSTEM_LTX, path: "configs/system.ltx" },
  { content: "changed", path: "textures/ui_empty.dds" },
  { content: "changed", path: "configs/text/eng/st_ui.xml" },
];

describe("archive pack-patch scope", () => {
  const box = new Sandbox(__filename);

  let base: string;
  let target: string;

  const changedNames = (report: string): Array<string> => {
    const envelope = box.json(report) as {
      result: { added: Array<{ name: string }>; modified: Array<{ name: string }> };
    };

    return [...envelope.result.added, ...envelope.result.modified].map((change) => change.name).sort();
  };

  const compare = (name: string, scope: Array<string>): CliResult =>
    box.run("archive pack-patch", [
      "--input",
      base,
      "--target",
      target,
      "--dest",
      box.at(name),
      "--dry-run",
      "--silent",
      "--report",
      box.at(`${name}.json`),
      ...scope,
    ]);

  beforeAll(() => {
    base = createWorld(box, "base");
    target = createWorld(box, "target", TARGET_EDITS);

    compare("unscoped", []);
    compare("included", ["--include", "configs"]);
    compare("ignored", ["--ignore", "configs\\text"]);
    compare("excluded", ["--exclude-extension", "*.xml"]);
    compare("narrow", ["--include", "configs", "--ignore", "configs\\text"]);
  });

  it("should compare the whole of both worlds by default", () => {
    expect(changedNames("unscoped.json")).toEqual([
      "configs\\system.ltx",
      "configs\\text\\eng\\st_ui.xml",
      "textures\\ui_empty.dds",
    ]);
  });

  it("should restrict the comparison to an included prefix", () => {
    expect(changedNames("included.json")).toEqual(["configs\\system.ltx", "configs\\text\\eng\\st_ui.xml"]);
  });

  it("should drop an ignored prefix", () => {
    expect(changedNames("ignored.json")).toEqual(["configs\\system.ltx", "textures\\ui_empty.dds"]);
  });

  it("should drop an excluded extension", () => {
    expect(changedNames("excluded.json")).toEqual(["configs\\system.ltx", "textures\\ui_empty.dds"]);
  });

  it("should apply an ignore over an include", () => {
    expect(changedNames("narrow.json")).toEqual(["configs\\system.ltx"]);
  });

  it("should narrow both sides alike, so a scope never invents a difference", () => {
    // Everything outside `configs` is absent from both sides of the scoped comparison rather than
    // present on one, which is what keeps a narrowed run from reporting additions or removals.
    const envelope = box.json("included.json") as { result: { added: Array<unknown> } };

    expect(envelope.result.added).toEqual([]);
  });
});
