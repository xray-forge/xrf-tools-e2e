import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("textures/act_cat_bump.thm");
const BUMP = "wpn\\wpn_pm\\wpn_pm_bump";

describe("thm patch-bump destination", () => {
  const box = new Sandbox(__filename);

  let assigned: CliResult;
  let inPlace: CliResult;

  beforeAll(() => {
    assigned = box.run("thm patch-bump", ["--path", SOURCE, "--dest", box.at("assigned.thm"), "--to", BUMP]);

    // With no destination the command rewrites its input, so it works on a copy.
    inPlace = box.run("thm patch-bump", ["--path", box.copyIn(SOURCE, "in-place.thm"), "--to", BUMP]);
  });

  it("should write the assigned reference to a destination", () => {
    expect(assigned).toMatchSnapshot();
  });

  it("should rewrite in place when given no destination", () => {
    expect(inPlace).toMatchSnapshot();
  });

  it("should agree with the copy written to a destination", () => {
    expect(box.sha("in-place.thm")).toBe(box.sha("assigned.thm"));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
