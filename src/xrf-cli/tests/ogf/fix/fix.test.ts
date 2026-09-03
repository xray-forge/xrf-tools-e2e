import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const RESIDUE = gamedata("meshes/ogf/residue_split_motion_ref.ogf");
const CLEAN = gamedata("meshes/ogf/dev_bolt_hud.ogf");

/**
 * What `ogf fix` writes, reports and refuses.
 *
 * @remarks
 * The residue visual carries an uncounted motion reference split across the declared bounds of its
 * motion refs chunk. Fixing drops it, names it first, and changes nothing the engine loads; a visual
 * whose trailing bytes belong to nothing is refused rather than truncated to its last good chunk.
 */
describe("ogf fix", () => {
  const box = new Sandbox(__filename);

  let dryRun: CliResult;
  let toDestination: CliResult;
  let fixedInfo: CliResult;
  let tree: CliResult;
  let again: CliResult;

  beforeAll(() => {
    dryRun = box.run("ogf fix", ["--path", RESIDUE, "--dry-run", "--report", box.at("dry-run.json")]);
    toDestination = box.run("ogf fix", [
      "--path",
      RESIDUE,
      "--dest",
      box.at("fixed.ogf"),
      "--report",
      box.at("fixed.json"),
    ]);
    fixedInfo = box.run("ogf info", ["--path", box.at("fixed.ogf")]);

    // A sweep: one visual to normalize, one already well-formed, one the reader refuses. The refusal
    // fails the run at the end, after the others were handled.
    box.copyIn(RESIDUE, "meshes/residue.ogf");
    box.copyIn(CLEAN, "meshes/nested/clean.ogf");
    fs.appendFileSync(box.copyIn(RESIDUE, "meshes/unaccountable.ogf"), "unaccounted");
    tree = box.run("ogf fix", ["--path", box.at("meshes"), "-j", "1", "--report", box.at("tree.json")], {
      expectExit: 1,
    });

    again = box.run("ogf fix", ["--path", box.at("meshes/residue.ogf"), "--report", box.at("again.json")]);
  });

  it("should report a dry run without writing", () => {
    expect(dryRun).toMatchSnapshot();
  });

  it("should report what a dry run would discard", () => {
    expect(box.json("dry-run.json")).toMatchSnapshot();
  });

  it("should name the discarded reference before writing", () => {
    expect(toDestination).toMatchSnapshot();
  });

  it("should report the normalized visual", () => {
    expect(box.json("fixed.json")).toMatchSnapshot();
  });

  // The declared references survive and the residue is gone.
  it("should read back the same references with no residue", () => {
    expect(fixedInfo).toMatchSnapshot();
  });

  it("should change the bytes it fixed", () => {
    expect(box.sha("fixed.ogf")).not.toBe(sha(RESIDUE));
  });

  it("should sweep a directory and fail for what it refused", () => {
    expect(tree).toMatchSnapshot();
  });

  it("should report the sweep beside its findings", () => {
    expect(box.json("tree.json")).toMatchSnapshot();
  });

  it("should agree with the copy written to a destination", () => {
    expect(box.sha("meshes/residue.ogf")).toBe(box.sha("fixed.ogf"));
  });

  it("should leave the refused visual untouched", () => {
    expect(fs.readFileSync(box.at("meshes/unaccountable.ogf")).subarray(0, fs.statSync(RESIDUE).size)).toEqual(
      fs.readFileSync(RESIDUE)
    );
  });

  it("should leave a visual it already fixed alone", () => {
    expect(again).toMatchSnapshot();
  });

  it("should report nothing left to discard", () => {
    expect(box.json("again.json")).toMatchSnapshot();
  });

  it("should write only the fixed visuals and reports", () => {
    expect(box.manifest({ normalized: ["again.json", "dry-run.json", "fixed.json", "tree.json"] })).toMatchSnapshot();
  });
});
