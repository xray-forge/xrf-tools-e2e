import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("ogf info", () => {
  const box = new Sandbox(__filename);

  let minimal: CliResult;
  let prop: CliResult;
  let weapon: CliResult;

  beforeAll(() => {
    // A single bone with one child and progressive lods, a static prop, and a weapon lod: three
    // different shapes of the same header.
    minimal = box.run("ogf info", ["--path", gamedata("meshes/ogf/part_none.ogf")]);
    prop = box.run("ogf info", ["--path", gamedata("meshes/ogf/notes_paper_1.ogf")]);
    weapon = box.run("ogf info", ["--path", gamedata("meshes/ogf/wpn_pm_lod.ogf")]);
  });

  it("should report a minimal visual", () => {
    expect(minimal).toMatchSnapshot();
  });

  it("should report a static prop", () => {
    expect(prop).toMatchSnapshot();
  });

  it("should report a weapon lod", () => {
    expect(weapon).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
