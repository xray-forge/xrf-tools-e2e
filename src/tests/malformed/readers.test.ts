import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

/**
 * Refusing damaged input is part of a reader's contract, and the message it refuses with is the
 * only thing telling a modder which file is broken and where. Every case here truncates a real
 * asset rather than inventing random bytes, so the reader gets a plausible header followed by
 * nothing, which is what a failed export or a half-copied file looks like.
 */
describe("readers reject damaged input", () => {
  const box = new Sandbox(__filename);

  let ogf: CliResult;
  let omf: CliResult;
  let particles: CliResult;
  let spawn: CliResult;
  let dds: CliResult;
  let empty: CliResult;
  let missing: CliResult;
  let ltx: CliResult;
  let translation: CliResult;

  beforeAll(() => {
    const fail = { expectExit: 1 };

    ogf = box.run(
      "info-ogf",
      ["--path", box.copyTruncated(gamedata("meshes/ogf/part_none.ogf"), "bad.ogf", 200)],
      fail
    );
    omf = box.run(
      "info-omf",
      ["--path", box.copyTruncated(gamedata("meshes/omf/wpn_svd_hud_animation.omf"), "bad.omf", 100)],
      fail
    );
    particles = box.run("info-particles", ["--path", box.copyTruncated(gamedata("particles.xr"), "bad.xr", 500)], fail);
    spawn = box.run("info-spawn", ["--path", box.copyTruncated(gamedata("spawns/all.spawn"), "bad.spawn", 400)], fail);
    dds = box.run(
      "info-dds",
      ["--path", box.copyTruncated(gamedata("textures/ui/ui_test_sheet.dds"), "bad.dds", 60)],
      fail
    );

    empty = box.run("info-ogf", ["--path", box.write("empty.ogf", "")], fail);
    missing = box.run("info-ogf", ["--path", box.at("does-not-exist.ogf")], fail);

    box.write("configs/broken.ltx", "[unterminated\nkey = value\n");
    ltx = box.run("verify-ltx", ["--path", box.at("configs")], fail);

    box.write("translations/broken.json", '{ "st_x": { "eng": }\n');
    translation = box.run("verify-translation", ["--path", box.at("translations")], fail);
  });

  it("should refuse a truncated visual", () => {
    expect(ogf).toMatchSnapshot();
  });

  it("should refuse a truncated animation container", () => {
    expect(omf).toMatchSnapshot();
  });

  it("should refuse a truncated particle container", () => {
    expect(particles).toMatchSnapshot();
  });

  it("should refuse a truncated spawn", () => {
    expect(spawn).toMatchSnapshot();
  });

  it("should refuse a truncated texture", () => {
    expect(dds).toMatchSnapshot();
  });

  it("should refuse an empty file", () => {
    expect(empty).toMatchSnapshot();
  });

  it("should refuse a path that does not exist", () => {
    expect(missing).toMatchSnapshot();
  });

  it("should refuse an unparseable ltx", () => {
    expect(ltx).toMatchSnapshot();
  });

  it("should refuse an unparseable translation source", () => {
    expect(translation).toMatchSnapshot();
  });

  // Nothing above may leave an output file behind: a reader that refuses its input must not have
  // written a partial result first.
  it("should write nothing beyond the damaged inputs", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
