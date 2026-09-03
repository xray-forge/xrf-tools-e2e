import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Refusing damaged input is part of a reader's contract, and the message it refuses with is the
 * only thing telling a modder which file is broken and where. Cases derive their damage from real
 * or synthetic committed assets rather than inventing a whole file of random bytes, so the reader
 * reaches the malformed boundary through a valid format prefix.
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
  let unaccountableResidue: CliResult;

  beforeAll(() => {
    const fail = { expectExit: 1 };

    ogf = box.run(
      "ogf info",
      ["--path", box.copyTruncated(gamedata("meshes/ogf/part_none.ogf"), "bad.ogf", 200)],
      fail
    );

    const unaccountable: string = box.copyIn(
      gamedata("meshes/ogf/residue_split_motion_ref.ogf"),
      "unaccountable-residue.ogf"
    );

    // The source's tail is accepted only because it completes exactly one split motion ref. Bytes
    // after its terminator make that explanation impossible, so the strict chunk error must stay.
    fs.appendFileSync(unaccountable, "unaccounted");
    unaccountableResidue = box.run("ogf info", ["--path", unaccountable], fail);

    omf = box.run(
      "omf info",
      ["--path", box.copyTruncated(gamedata("meshes/omf/wpn_svd_hud_animation.omf"), "bad.omf", 100)],
      fail
    );
    particles = box.run("particle info", ["--path", box.copyTruncated(gamedata("particles.xr"), "bad.xr", 500)], fail);
    spawn = box.run("spawn info", ["--path", box.copyTruncated(gamedata("spawns/all.spawn"), "bad.spawn", 400)], fail);
    dds = box.run(
      "dds info",
      ["--path", box.copyTruncated(gamedata("textures/ui/ui_test_sheet.dds"), "bad.dds", 60)],
      fail
    );

    empty = box.run("ogf info", ["--path", box.write("empty.ogf", "")], fail);
    missing = box.run("ogf info", ["--path", box.at("does-not-exist.ogf")], fail);

    // The two verifiers below judge the damaged file rather than failing to run, so they answer
    // the check verdict 3 where the readers above answer the operational 1.
    box.write("configs/broken.ltx", "[unterminated\nkey = value\n");
    ltx = box.run("ltx verify", ["--path", box.at("configs")], { expectExit: 3 });

    box.write("translations/broken.json", '{ "st_x": { "eng": }\n');
    translation = box.run("translation verify", ["--path", box.at("translations")], { expectExit: 3 });
  });

  it("should refuse a truncated visual", () => {
    expect(ogf).toMatchSnapshot();
  });

  it("should refuse unaccountable visual residue", () => {
    expect(unaccountableResidue).toMatchSnapshot();
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
