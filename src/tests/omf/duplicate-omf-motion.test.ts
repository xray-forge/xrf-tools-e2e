import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

// Three motions: idle, svd_shoot, svd_reload.
const SOURCE = gamedata("meshes/omf/wpn_svd_hud_animation.omf");

describe("duplicate-omf-motion", () => {
  const box = new Sandbox(__filename);

  let duplicated: CliResult;
  let duplicatedOnce: CliResult;
  let info: CliResult;

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

    info = box.run("info-omf", ["--path", box.at("duplicated.omf")]);
  });

  it("should duplicate a motion under a new name", () => {
    expect(duplicated).toMatchSnapshot();
  });

  it("should duplicate a motion that plays once", () => {
    expect(duplicatedOnce).toMatchSnapshot();
  });

  it("should read back the duplicated motion", () => {
    expect(info).toMatchSnapshot();
  });

  // Looping is stored on the motion, so the same copy made with and without --play-once cannot be
  // the same bytes.
  it("should not produce the same file with and without play-once", () => {
    expect(box.sha("duplicated-once.omf")).not.toBe(box.sha("duplicated.omf"));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
