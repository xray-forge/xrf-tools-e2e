import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

const SOURCE = gamedata("textures/act_cat_bump.thm");

describe("patch-thm-bump", () => {
  const box = new Sandbox(__filename);

  let dryRun: CliResult;
  let assigned: CliResult;
  let cleared: CliResult;
  let inPlace: CliResult;

  beforeAll(() => {
    dryRun = box.run("patch-thm-bump", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-written.thm"),
      "--to",
      "wpn\\wpn_pm\\wpn_pm_bump",
      "--dry-run",
    ]);

    assigned = box.run("patch-thm-bump", [
      "--path",
      SOURCE,
      "--dest",
      box.at("assigned.thm"),
      "--to",
      "wpn\\wpn_pm\\wpn_pm_bump",
    ]);
    cleared = box.run("patch-thm-bump", ["--path", SOURCE, "--dest", box.at("cleared.thm"), "--off"]);

    // With no destination the command rewrites its input, so it works on a copy.
    inPlace = box.run("patch-thm-bump", [
      "--path",
      box.copyIn(SOURCE, "in-place.thm"),
      "--to",
      "wpn\\wpn_pm\\wpn_pm_bump",
    ]);
  });

  it("should report a dry run without writing", () => {
    expect(dryRun).toMatchSnapshot();
  });

  it("should assign a bump reference", () => {
    expect(assigned).toMatchSnapshot();
  });

  it("should clear the bump reference", () => {
    expect(cleared).toMatchSnapshot();
  });

  it("should rewrite in place when given no destination", () => {
    expect(inPlace).toMatchSnapshot();
  });

  // Writing a reference grows the file; the dry run reported the same size beforehand.
  it("should change the bytes it patched", () => {
    expect(box.sha("assigned.thm")).not.toBe(sha(SOURCE));
  });

  // An in-place rewrite has to land on the same bytes as writing to a destination does.
  it("should agree with the copy written to a destination", () => {
    expect(box.sha("in-place.thm")).toBe(box.sha("assigned.thm"));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
