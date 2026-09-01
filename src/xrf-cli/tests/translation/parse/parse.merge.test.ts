import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const MOD_ARGS: Array<string> = ["--path", resource("mod-text"), "--source", "directory"];

describe("translation parse merges into authored sources", () => {
  const box = new Sandbox(__filename);

  let kept: CliResult;
  let replaced: CliResult;

  beforeAll(() => {
    // A source already carrying a hand-authored English value for an id the mod also defines.
    box.write("sources/st_ui.json", `{\n  "st_ui_start": { "eng": "Begin" }\n}\n`);

    kept = box.run("translation parse", [
      ...MOD_ARGS,
      "--language",
      "eng",
      "--output",
      box.at("sources"),
      "--file",
      "st_ui.xml",
    ]);

    replaced = box.run("translation parse", [
      ...MOD_ARGS,
      "--language",
      "eng",
      "--output",
      box.at("sources"),
      "--file",
      "st_ui.xml",
      "--overwrite",
    ]);
  });

  // A translator's edits are the thing most likely to differ from the mod they came from, so the
  // merge keeps them and says how many differed rather than replacing them.
  it("should keep the existing text by default", () => {
    expect(kept).toMatchSnapshot();
  });

  it("should replace it only when asked", () => {
    expect(replaced).toMatchSnapshot();
  });

  it("should end with the imported text", () => {
    expect(box.json("sources/st_ui.json")).toMatchSnapshot();
  });

  // Narrowed to one table, so nothing else in the same language is touched at all.
  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
