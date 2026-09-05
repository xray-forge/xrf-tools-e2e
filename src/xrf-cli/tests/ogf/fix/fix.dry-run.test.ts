import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const RESIDUE = gamedata("meshes/ogf/residue_split_motion_ref.ogf");

describe("ogf fix dry run", () => {
  const box = new Sandbox(__filename);

  let dryRun: CliResult;
  let sourceBefore: string;

  beforeAll(() => {
    sourceBefore = sha(RESIDUE);
    dryRun = box.run("ogf fix", ["--path", RESIDUE, "--dry-run", "--report", box.at("dry-run.json")]);
  });

  it("should report a dry run without writing", () => {
    expect(dryRun).toMatchSnapshot();
    expect(sha(RESIDUE)).toBe(sourceBefore);
  });

  it("should report what a dry run would discard", () => {
    expect(box.json("dry-run.json")).toMatchSnapshot();
  });

  it("should write only its report", () => {
    expect(box.manifest({ normalized: ["dry-run.json"] })).toMatchSnapshot();
  });
});
