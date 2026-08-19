import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

// Three motions: idle, svd_shoot, svd_reload.
const SOURCE = gamedata("meshes/omf/wpn_svd_hud_animation.omf");

describe("filter-omf-motions", () => {
  const box = new Sandbox(__filename);

  let keptOne: CliResult;
  let keptPrefix: CliResult;
  let keptSeveral: CliResult;
  let dryRun: CliResult;
  let info: CliResult;

  beforeAll(() => {
    keptOne = box.run("filter-omf-motions", ["--path", SOURCE, "--dest", box.at("kept-idle.omf"), "--keep", "idle"]);
    keptPrefix = box.run("filter-omf-motions", [
      "--path",
      SOURCE,
      "--dest",
      box.at("kept-svd.omf"),
      "--keep-prefix",
      "svd_",
    ]);
    dryRun = box.run("filter-omf-motions", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-written.omf"),
      "--keep",
      "idle",
      "--dry-run",
    ]);

    // --keep takes several names after one flag rather than being repeated; passing it twice is a
    // usage error, so this is the only way to keep more than one motion by name.
    keptSeveral = box.run("filter-omf-motions", [
      "--path",
      SOURCE,
      "--dest",
      box.at("kept-two.omf"),
      "--keep",
      "idle",
      "svd_shoot",
    ]);

    info = box.run("info-omf", ["--path", box.at("kept-svd.omf")]);
  });

  it("should keep a named motion", () => {
    expect(keptOne).toMatchSnapshot();
  });

  it("should keep motions by prefix", () => {
    expect(keptPrefix).toMatchSnapshot();
  });

  it("should read back only the kept motions", () => {
    expect(info).toMatchSnapshot();
  });

  it("should keep several named motions at once", () => {
    expect(keptSeveral).toMatchSnapshot();
  });

  it("should read back every kept motion", () => {
    expect(box.run("info-omf", ["--path", box.at("kept-two.omf")])).toMatchSnapshot();
  });

  it("should report a dry run without writing", () => {
    expect(dryRun).toMatchSnapshot();
  });

  // The manifest is what proves the dry run wrote nothing: its destination never appears in it.
  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
