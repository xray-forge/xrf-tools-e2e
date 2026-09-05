import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const RESIDUE = gamedata("meshes/ogf/residue_split_motion_ref.ogf");
const CLEAN = gamedata("meshes/ogf/dev_bolt_hud.ogf");

describe("ogf fix sweep", () => {
  const box = new Sandbox(__filename);

  let tree: CliResult;
  let cleanBefore: string;
  let refusedBefore: string;

  beforeAll(() => {
    box.copyIn(RESIDUE, "meshes/residue.ogf");
    box.copyIn(CLEAN, "meshes/nested/clean.ogf");
    fs.appendFileSync(box.copyIn(RESIDUE, "meshes/unaccountable.ogf"), "unaccounted");
    cleanBefore = box.sha("meshes/nested/clean.ogf");
    refusedBefore = box.sha("meshes/unaccountable.ogf");

    tree = box.run("ogf fix", ["--path", box.at("meshes"), "-j", "1", "--report", box.at("tree.json")], {
      expectExit: 1,
    });
  });

  it("should sweep a directory and fail for what it refused", () => {
    expect(tree).toMatchSnapshot();
  });

  it("should report the sweep beside its findings", () => {
    expect(box.json("tree.json")).toMatchSnapshot();
  });

  it("should preserve the clean visual and every byte of the refused visual", () => {
    expect(box.sha("meshes/nested/clean.ogf")).toBe(cleanBefore);
    expect(box.sha("meshes/unaccountable.ogf")).toBe(refusedBefore);
  });

  it("should write only the sweep inputs and report", () => {
    expect(box.manifest({ normalized: ["tree.json"] })).toMatchSnapshot();
  });
});
