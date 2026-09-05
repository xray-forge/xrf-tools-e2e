import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("textures/act_cat_bump.thm");
const BUMP = "wpn\\wpn_pm\\wpn_pm_bump";
// This fixture has a bump chunk at byte 103, with unrelated chunks on both sides.
const BUMP_CHUNK_OFFSET = 103;

describe("thm patch-bump assignment and disable", () => {
  const box = new Sandbox(__filename);

  let assigned: CliResult;
  let cleared: CliResult;
  let disabledAssigned: CliResult;

  beforeAll(() => {
    assigned = box.run("thm patch-bump", [
      "--path",
      SOURCE,
      "--dest",
      box.at("assigned.thm"),
      "--to",
      BUMP,
      "--report",
      box.at("assigned.json"),
    ]);
    cleared = box.run("thm patch-bump", [
      "--path",
      SOURCE,
      "--dest",
      box.at("cleared.thm"),
      "--off",
      "--report",
      box.at("cleared.json"),
    ]);
    disabledAssigned = box.run("thm patch-bump", [
      "--path",
      box.at("assigned.thm"),
      "--dest",
      box.at("disabled-assigned.thm"),
      "--off",
      "--report",
      box.at("disabled-assigned.json"),
    ]);
  });

  it("should assign a bump reference", () => {
    expect(assigned).toMatchSnapshot();
  });

  it("should report the bump it replaced", () => {
    expect(box.json("assigned.json")).toMatchSnapshot();
  });

  it("should change only the bump name and its chunk size", () => {
    const source = fs.readFileSync(SOURCE);
    const assignedBytes = fs.readFileSync(box.at("assigned.thm"));

    expect(source.readUInt32LE(BUMP_CHUNK_OFFSET)).toBe(0x0817);
    expect(source.readUInt32LE(BUMP_CHUNK_OFFSET + 4)).toBe(9);
    expect(assignedBytes.readUInt32LE(BUMP_CHUNK_OFFSET)).toBe(0x0817);
    expect(assignedBytes.readUInt32LE(BUMP_CHUNK_OFFSET + 4)).toBe(9 + BUMP.length);
    expect(assignedBytes.subarray(0, BUMP_CHUNK_OFFSET)).toEqual(source.subarray(0, BUMP_CHUNK_OFFSET));
    expect(assignedBytes.subarray(BUMP_CHUNK_OFFSET + 8, BUMP_CHUNK_OFFSET + 16)).toEqual(
      source.subarray(BUMP_CHUNK_OFFSET + 8, BUMP_CHUNK_OFFSET + 16)
    );
    expect(assignedBytes.subarray(BUMP_CHUNK_OFFSET + 16, BUMP_CHUNK_OFFSET + 17 + BUMP.length).toString("ascii")).toBe(
      `${BUMP}\0`
    );
    expect(assignedBytes.subarray(BUMP_CHUNK_OFFSET + 17 + BUMP.length)).toEqual(
      source.subarray(BUMP_CHUNK_OFFSET + 17)
    );
    expect(box.sha("assigned.thm")).not.toBe(sha(SOURCE));
  });

  it("should leave an already empty bump declaration unchanged", () => {
    expect(cleared).toMatchSnapshot();
    expect(box.sha("cleared.thm")).toBe(sha(SOURCE));
  });

  it("should report clearing the baseline declaration", () => {
    expect(box.json("cleared.json")).toMatchSnapshot();
  });

  it("should clear an assigned reference back to the baseline bytes", () => {
    expect(disabledAssigned).toMatchSnapshot();
    expect(box.json("disabled-assigned.json")).toMatchSnapshot();
    expect(box.json("disabled-assigned.json")).toMatchObject({
      result: { originalSize: 160, patchedSize: 138, previousMode: 1, previousName: BUMP },
    });
    expect(box.sha("disabled-assigned.thm")).toBe(sha(SOURCE));
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["assigned.json", "cleared.json", "disabled-assigned.json"] })).toMatchSnapshot();
  });
});
