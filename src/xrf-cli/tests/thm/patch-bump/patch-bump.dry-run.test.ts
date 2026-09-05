import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("textures/act_cat_bump.thm");
const BUMP = "wpn\\wpn_pm\\wpn_pm_bump";

describe("thm patch-bump dry run", () => {
  const box = new Sandbox(__filename);

  let dryRun: CliResult;
  let destinationBefore: string;
  let destinationWasAbsent: boolean;
  let sourceBefore: string;

  beforeAll(() => {
    const destination = box.at("never-written.thm");

    sourceBefore = sha(SOURCE);
    dryRun = box.run("thm patch-bump", [
      "--path",
      SOURCE,
      "--dest",
      destination,
      "--to",
      BUMP,
      "--dry-run",
      "--report",
      box.at("dry.json"),
    ]);
    destinationWasAbsent = !fs.existsSync(destination);

    box.copyIn(SOURCE, "never-written.thm");
    destinationBefore = box.sha("never-written.thm");
    box.run("thm patch-bump", [
      "--path",
      SOURCE,
      "--dest",
      destination,
      "--to",
      BUMP,
      "--dry-run",
      "--report",
      box.at("dry.json"),
    ]);
  });

  it("should report a dry run without writing", () => {
    expect(dryRun).toMatchSnapshot();
  });

  it("should report the intended original and patched sizes", () => {
    expect(box.json("dry.json")).toMatchSnapshot();
    expect(box.json("dry.json")).toMatchObject({
      result: { isDryRun: true, originalSize: 138, patchedSize: 160, previousMode: 1, previousName: "" },
    });
  });

  it("should not create an absent destination", () => {
    expect(destinationWasAbsent).toBe(true);
  });

  it("should preserve both the complete source and an existing destination", () => {
    expect(sha(SOURCE)).toBe(sourceBefore);
    expect(box.sha("never-written.thm")).toBe(destinationBefore);
  });

  it("should write only the report and preserved destination", () => {
    expect(box.manifest({ normalized: ["dry.json"] })).toMatchSnapshot();
  });
});
