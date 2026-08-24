import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("ogf verify", () => {
  const box = new Sandbox(__filename);

  let single: CliResult;
  let sweep: CliResult;

  beforeAll(() => {
    // The visuals reference textures the trimmed tree does not carry, so the texture check cannot
    // complete and the command answers the operational 1 rather than the check verdict 3. Geometry
    // is still fully verified.
    single = box.run("ogf verify", ["--path", gamedata("meshes/ogf/wpn_pm_lod.ogf")], { expectExit: 1 });
    sweep = box.run("ogf verify", ["--path", gamedata("meshes/ogf"), "--report", box.at("report.json")], {
      expectExit: 1,
    });
  });

  it("should verify a standalone visual", () => {
    expect(single).toMatchSnapshot();
  });

  it("should sweep a directory", () => {
    expect(sweep).toMatchSnapshot();
  });

  // The report records how long the sweep took, so its raw bytes differ every run for reasons that
  // say nothing about behavior. Comparing normalized content keeps every finding under comparison.
  it("should write a report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
