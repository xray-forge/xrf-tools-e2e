import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

// A hud visual: the lod visuals in the corpus carry no motion refs chunk, and this command needs
// one to exist. It already references dynamics\devices\dev_bolt\dev_bolt_hud_animation.
const SOURCE = gamedata("meshes/ogf/dev_bolt_hud.ogf");

describe("ogf patch-motion-refs", () => {
  const box = new Sandbox(__filename);

  let repointed: CliResult;
  let dryRun: CliResult;
  let several: CliResult;
  let inPlace: CliResult;
  let info: CliResult;

  beforeAll(() => {
    repointed = box.run("ogf patch-motion-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("repointed.ogf"),
      "--refs",
      "dynamics\\devices\\dev_bolt\\dev_bolt_replacement",
    ]);
    dryRun = box.run("ogf patch-motion-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-written.ogf"),
      "--refs",
      "dynamics\\devices\\dev_bolt\\dev_bolt_replacement",
      "--dry-run",
    ]);

    // --refs stores a list, and storing several is the reason it takes one. A single value would
    // never show that the others survive alongside it.
    several = box.run("ogf patch-motion-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("several.ogf"),
      "--refs",
      "dynamics\\devices\\dev_bolt\\first",
      "dynamics\\devices\\dev_bolt\\second",
    ]);

    // With no --dest the command rewrites its input, which is the destructive default.
    inPlace = box.run("ogf patch-motion-refs", [
      "--path",
      box.copyIn(SOURCE, "in-place.ogf"),
      "--refs",
      "dynamics\\devices\\dev_bolt\\dev_bolt_replacement",
    ]);

    info = box.run("ogf info", ["--path", box.at("repointed.ogf")]);
  });

  it("should store motion refs", () => {
    expect(repointed).toMatchSnapshot();
  });

  it("should report a dry run without writing", () => {
    expect(dryRun).toMatchSnapshot();
  });

  // The visual now names the replacement animation instead of the one it shipped with.
  it("should read back the stored refs", () => {
    expect(info).toMatchSnapshot();
  });

  it("should change the bytes it patched", () => {
    expect(box.sha("repointed.ogf")).not.toBe(sha(SOURCE));
  });

  it("should store several refs at once", () => {
    expect(several).toMatchSnapshot();
  });

  it("should read back every stored ref", () => {
    expect(box.run("ogf info", ["--path", box.at("several.ogf")])).toMatchSnapshot();
  });

  it("should rewrite in place when given no destination", () => {
    expect(inPlace).toMatchSnapshot();
  });

  it("should agree with the copy written to a destination", () => {
    expect(box.sha("in-place.ogf")).toBe(box.sha("repointed.ogf"));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
