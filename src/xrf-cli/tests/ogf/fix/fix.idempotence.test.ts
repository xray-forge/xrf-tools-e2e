import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const RESIDUE = gamedata("meshes/ogf/residue_split_motion_ref.ogf");

describe("ogf fix idempotence", () => {
  const box = new Sandbox(__filename);

  let first: CliResult;
  let again: CliResult;
  let fixedBytes: string;

  beforeAll(() => {
    box.copyIn(RESIDUE, "meshes/residue.ogf");
    first = box.run("ogf fix", ["--path", box.at("meshes/residue.ogf")]);
    fixedBytes = box.sha("meshes/residue.ogf");
    again = box.run("ogf fix", ["--path", box.at("meshes/residue.ogf"), "--report", box.at("again.json")]);
  });

  it("should leave a visual it already fixed alone", () => {
    expect(first.exitCode).toBe(0);
    expect(again).toMatchSnapshot();
    expect(box.sha("meshes/residue.ogf")).toBe(fixedBytes);
  });

  it("should report nothing left to discard", () => {
    expect(box.json("again.json")).toMatchSnapshot();
  });

  it("should write only the fixed visual and report", () => {
    expect(box.manifest({ normalized: ["again.json"] })).toMatchSnapshot();
  });
});
