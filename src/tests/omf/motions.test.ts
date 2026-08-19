import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

// Three motions: idle, svd_shoot, svd_reload.
const SOURCE = gamedata("meshes/omf/wpn_svd_hud_animation.omf");

describe("omf motion editing", () => {
  const box = new Sandbox(__filename);

  let duplicated: CliResult;
  let duplicatedOnce: CliResult;
  let keptOne: CliResult;
  let keptPrefix: CliResult;
  let filterDryRun: CliResult;
  let renamed: CliResult;
  let renameDryRun: CliResult;

  beforeAll(() => {
    duplicated = box.run("duplicate-omf-motion", [
      "--path",
      SOURCE,
      "--dest",
      box.at("duplicated.omf"),
      "--from",
      "idle",
      "--to",
      "idle_copy",
    ]);

    // The copy can be made to play once instead of looping, which is the reason to duplicate a
    // motion rather than reuse it.
    duplicatedOnce = box.run("duplicate-omf-motion", [
      "--path",
      SOURCE,
      "--dest",
      box.at("duplicated-once.omf"),
      "--from",
      "idle",
      "--to",
      "idle_once",
      "--play-once",
    ]);

    keptOne = box.run("filter-omf-motions", ["--path", SOURCE, "--dest", box.at("kept-idle.omf"), "--keep", "idle"]);
    keptPrefix = box.run("filter-omf-motions", [
      "--path",
      SOURCE,
      "--dest",
      box.at("kept-svd.omf"),
      "--keep-prefix",
      "svd_",
    ]);
    filterDryRun = box.run("filter-omf-motions", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-written.omf"),
      "--keep",
      "idle",
      "--dry-run",
    ]);

    const map = box.write("rename-map.json", `${JSON.stringify({ idle: "stand", svd_shoot: "fire" }, undefined, 2)}\n`);

    renamed = box.run("rename-omf-motions", ["--path", SOURCE, "--dest", box.at("renamed.omf"), "--map", map]);
    renameDryRun = box.run("rename-omf-motions", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-renamed.omf"),
      "--map",
      map,
      "--dry-run",
    ]);
  });

  it("should duplicate a motion under a new name", () => {
    expect(duplicated).toMatchSnapshot();
  });

  it("should duplicate a motion that plays once", () => {
    expect(duplicatedOnce).toMatchSnapshot();
  });

  it("should read back the duplicated motion", () => {
    expect(box.run("info-omf", ["--path", box.at("duplicated.omf")])).toMatchSnapshot();
  });

  // Looping is stored on the motion, so the same copy made with and without --play-once cannot be
  // the same bytes.
  it("should not produce the same file with and without play-once", () => {
    expect(box.sha("duplicated-once.omf")).not.toBe(box.sha("duplicated.omf"));
  });

  it("should keep a named motion", () => {
    expect(keptOne).toMatchSnapshot();
  });

  it("should keep motions by prefix", () => {
    expect(keptPrefix).toMatchSnapshot();
  });

  it("should read back only the kept motions", () => {
    expect(box.run("info-omf", ["--path", box.at("kept-svd.omf")])).toMatchSnapshot();
  });

  it("should rename motions through a map", () => {
    expect(renamed).toMatchSnapshot();
  });

  it("should read back the renamed motions", () => {
    expect(box.run("info-omf", ["--path", box.at("renamed.omf")])).toMatchSnapshot();
  });

  // Strict requires the map to cover every motion, and this one leaves svd_reload out.
  it("should reject an incomplete map under strict", () => {
    expect(
      box.run(
        "rename-omf-motions",
        ["--path", SOURCE, "--dest", box.at("never-strict.omf"), "--map", box.at("rename-map.json"), "--strict"],
        { expectExit: 1 }
      )
    ).toMatchSnapshot();
  });

  it("should report a filter dry run without writing", () => {
    expect(filterDryRun).toMatchSnapshot();
  });

  it("should report a rename dry run without writing", () => {
    expect(renameDryRun).toMatchSnapshot();
  });

  // The manifest is what proves the dry runs wrote nothing: neither destination appears in it.
  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
