import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("textures/act_cat_bump.thm");

describe("thm set-field directory", () => {
  const box = new Sandbox(__filename);

  let edited: CliResult;
  let repeated: CliResult;
  let noField: CliResult;
  let printed: CliResult;

  beforeAll(() => {
    box.copyIn(SOURCE, "textures/a.thm");
    box.copyIn(SOURCE, "textures/nested/b.thm");

    edited = box.run("thm set-field", [
      box.at("textures"),
      "--detail-name",
      "detail\\detail_stone",
      "--set-flag",
      "flDiffuseDetail",
      "--report",
      box.at("edit.json"),
    ]);
    repeated = box.run("thm set-field", [
      box.at("textures"),
      "--detail-name",
      "detail\\detail_stone",
      "--set-flag",
      "flDiffuseDetail",
      "--report",
      box.at("repeat.json"),
    ]);
    noField = box.run("thm set-field", [box.at("textures")], { expectExit: 2 });
    printed = box.run("thm info", [box.at("textures/nested/b.thm")]);
  });

  it("should read back with the detail and its flag set", () => {
    expect(printed).toMatchSnapshot();
  });

  it("should edit every texture descriptor below the directory", () => {
    expect(edited).toMatchSnapshot();
    expect(box.json("edit.json")).toMatchSnapshot();
  });

  it("should leave descriptors already as named unwritten", () => {
    expect(repeated).toMatchSnapshot();
    expect(box.json("repeat.json")).toMatchSnapshot();
  });

  it("should need a field to set", () => {
    expect(noField).toMatchSnapshot();
  });

  it("should give both descriptors the same bytes", () => {
    expect(box.sha("textures/a.thm")).toBe(box.sha("textures/nested/b.thm"));
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["edit.json", "repeat.json"] })).toMatchSnapshot();
  });
});
