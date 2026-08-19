import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

// A hud visual: the lod visuals in the corpus carry no motion refs chunk, and this command needs
// one to exist. It already references dynamics\devices\dev_bolt\dev_bolt_hud_animation.
const SOURCE = gamedata("meshes/ogf/dev_bolt_hud.ogf");

describe("patch-ogf-motion-refs", () => {
  const box = new Sandbox(__filename);

  let repointed: CliResult;
  let dryRun: CliResult;
  let info: CliResult;

  beforeAll(() => {
    repointed = box.run("patch-ogf-motion-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("repointed.ogf"),
      "--refs",
      "dynamics\\devices\\dev_bolt\\dev_bolt_replacement",
    ]);
    dryRun = box.run("patch-ogf-motion-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-written.ogf"),
      "--refs",
      "dynamics\\devices\\dev_bolt\\dev_bolt_replacement",
      "--dry-run",
    ]);

    info = box.run("info-ogf", ["--path", box.at("repointed.ogf")]);
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

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
