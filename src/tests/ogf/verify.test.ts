import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata, resource } from "#/test/constants";
import { envelopeAt, type CommandEnvelope } from "#/test/envelope";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("ogf verify", () => {
  const box = new Sandbox(__filename);

  let single: CliResult;
  let sweep: CliResult;
  let layered: CliResult;

  beforeAll(() => {
    // The visuals reference textures the trimmed tree does not carry, so the texture check cannot
    // complete and the command answers the operational 1 rather than the check verdict 3. Geometry
    // is still fully verified.
    single = box.run("ogf verify", ["--path", gamedata("meshes/ogf/wpn_pm_lod.ogf")], { expectExit: 1 });
    sweep = box.run("ogf verify", ["--path", gamedata("meshes/ogf"), "--report", box.at("report.json")], {
      expectExit: 1,
    });
    // A tree of meshes over a tree that carries one of the textures they name, which is how a mod overlay is read: the
    // sweep above measures the same visuals against nothing and calls every reference missing.
    layered = box.run("ogf verify", ["--path", gamedata("meshes/ogf"), "--root", resource("base")], { expectExit: 1 });
  });

  it("should verify a standalone visual", () => {
    expect(single).toMatchSnapshot();
  });

  it("should sweep a directory", () => {
    expect(sweep).toMatchSnapshot();
  });

  // The census has to say which root answered, or a sweep of an overlay reports its base game's textures as missing
  // and reads as a defect in the resolver rather than as a tree measured without the tree it layers over.
  it("should resolve textures from a layered root", () => {
    expect(layered).toMatchSnapshot();
  });

  // The sweep's own census and findings reach a caller under the shared envelope's `result`, which
  // is what moved when reporting became generic. The envelope itself is pinned in `cli/reporting`.
  it("should carry its checks under the envelope result", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

    expect(envelope.command).toEqual(["ogf", "verify"]);
    expect(envelope.result).not.toBeNull();
  });

  // The report records how long the sweep took, so its raw bytes differ every run for reasons that
  // say nothing about behavior. Comparing normalized content keeps every finding under comparison.

  it("should write a report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
