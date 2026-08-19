import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

// A hud visual: it carries both a motion reference and a texture reference, which the lod visuals
// in the corpus do not. patch-ogf-motion-refs needs the motion refs chunk to exist.
const SOURCE = gamedata("meshes/ogf/dev_bolt_hud.ogf");

describe("ogf reference patching", () => {
  const box = new Sandbox(__filename);

  let motionRefs: CliResult;
  let motionDryRun: CliResult;
  let textureRefs: CliResult;
  let textureDryRun: CliResult;
  let missingTexture: CliResult;

  beforeAll(() => {
    motionRefs = box.run("patch-ogf-motion-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("motion-refs.ogf"),
      "--refs",
      "dynamics\\devices\\dev_bolt\\dev_bolt_hud_animation",
    ]);
    motionDryRun = box.run("patch-ogf-motion-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-written.ogf"),
      "--refs",
      "dynamics\\devices\\dev_bolt\\dev_bolt_hud_animation",
      "--dry-run",
    ]);

    textureRefs = box.run("patch-ogf-texture-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("texture-refs.ogf"),
      "--from",
      "wpn\\wpn_bolt",
      "--to",
      "wpn\\wpn_bolt_renamed",
    ]);
    textureDryRun = box.run("patch-ogf-texture-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-renamed.ogf"),
      "--from",
      "wpn\\wpn_bolt",
      "--to",
      "wpn\\wpn_bolt_renamed",
      "--dry-run",
    ]);

    // The rename matches exactly and refuses rather than quietly doing nothing: a typo in --from
    // would otherwise report success while leaving the visual untouched. The refusal lists the
    // references the file actually carries, which is what makes the mistake obvious.
    missingTexture = box.run(
      "patch-ogf-texture-refs",
      [
        "--path",
        SOURCE,
        "--dest",
        box.at("unmatched.ogf"),
        "--from",
        "wpn\\does_not_exist",
        "--to",
        "wpn\\replacement",
      ],
      { expectExit: 1 }
    );
  });

  it("should store motion refs", () => {
    expect(motionRefs).toMatchSnapshot();
  });

  it("should report a motion ref dry run without writing", () => {
    expect(motionDryRun).toMatchSnapshot();
  });

  it("should rename a texture ref", () => {
    expect(textureRefs).toMatchSnapshot();
  });

  it("should report a texture ref dry run without writing", () => {
    expect(textureDryRun).toMatchSnapshot();
  });

  it("should refuse a reference the visual does not carry", () => {
    expect(missingTexture).toMatchSnapshot();
  });

  it("should read back the renamed texture reference", () => {
    expect(box.run("info-ogf", ["--path", box.at("texture-refs.ogf")])).toMatchSnapshot();
  });

  // Patching has to change the file, or the command silently did nothing.
  it("should change the bytes it patched", () => {
    expect(box.sha("texture-refs.ogf")).not.toBe(sha(SOURCE));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
