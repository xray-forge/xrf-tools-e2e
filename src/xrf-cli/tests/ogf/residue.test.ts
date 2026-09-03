import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("meshes/ogf/residue_split_motion_ref.ogf");

/**
 * The accepted OGF residue contract across inspection, project verification and mutation.
 *
 * @remarks
 * The synthetic visual declares four motion refs in chunk 24, then splits an ignored fifth ref
 * across the chunk boundary. The engine never reads that fifth ref, so inspection and verification
 * account for it while a patch deliberately normalizes it away.
 */
describe("ogf residue", () => {
  const box = new Sandbox(__filename);

  let info: CliResult;
  let patch: CliResult;
  let verify: CliResult;

  beforeAll(() => {
    info = box.run("ogf info", ["--path", SOURCE, "--report", box.at("info.json")]);

    box.write("gamedata/configs/system.ltx", "");
    box.copyIn(gamedata("shaders.xr"), "gamedata/shaders.xr");
    box.copyIn(SOURCE, "gamedata/meshes/ogf/residue_split_motion_ref.ogf");
    verify = box.run("gamedata verify", [box.at("gamedata"), "--checks", "meshes", "--report", box.at("verify.json")], {
      expectExit: 3,
    });

    patch = box.run("ogf patch-motion-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("patched.ogf"),
      "--refs",
      "actors\\replacement_animation",
      "--report",
      box.at("patch.json"),
    ]);
  });

  it("should explain accepted residue and still succeed", () => {
    expect(info).toMatchSnapshot();
  });

  it("should report the residue cause and discarded reference", () => {
    expect(box.json("info.json")).toMatchSnapshot();
  });

  it("should report chunk residue as a verification finding", () => {
    expect(verify).toMatchSnapshot();
  });

  it("should identify the chunk residue rule in the verification report", () => {
    expect(box.json("verify.json")).toMatchSnapshot();
  });

  it("should patch successfully after dropping the residue", () => {
    expect(patch).toMatchSnapshot();
  });

  it("should report how many bytes the patch dropped", () => {
    expect(box.json("patch.json")).toMatchSnapshot();
  });

  it("should write only the staged tree, reports and normalized visual", () => {
    expect(box.manifest({ normalized: ["info.json", "patch.json", "verify.json"] })).toMatchSnapshot();
  });
});
