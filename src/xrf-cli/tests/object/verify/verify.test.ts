import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * `object verify` of a decompiled object against the OGF it came from, which it stands in for, and against another
 * model, which it does not: exit 0 and exit 3, each with its report.
 *
 * The object is `dev_bolt_hud.ogf`, the corpus's two-bone HUD skeleton, decompiled here; the other model is the
 * one-bone `wpn_pm_lod.ogf`.
 */
describe("object verify", () => {
  const box = new Sandbox(__filename);
  const object: string = box.at("bolt.object");

  let passed: CliResult;
  let failed: CliResult;

  beforeAll(() => {
    box.run("object decompile", [gamedata("meshes/ogf/dev_bolt_hud.ogf"), "--dest", object]);

    passed = box.run("object verify", [
      object,
      "--ogf",
      gamedata("meshes/ogf/dev_bolt_hud.ogf"),
      "--report",
      box.at("passed.json"),
    ]);
    failed = box.run(
      "object verify",
      [object, "--ogf", gamedata("meshes/ogf/wpn_pm_lod.ogf"), "--report", box.at("failed.json")],
      { expectExit: 3 }
    );
  });

  it("should pass an object against the OGF it was decompiled from", () => {
    expect(envelopeAt(box.at("passed.json"))).toMatchObject({
      exitCode: 0,
      result: {
        status: "passed",
        census: { children: 1, referenceChildren: 1, vertices: 194, verticesMatched: 194, referenceFaces: 192 },
      },
    });
    expect(box.json("passed.json")).toMatchSnapshot();
    expect(passed).toMatchSnapshot();
  });

  it("should fail an object against another model with exit 3, naming each difference", () => {
    expect(envelopeAt(box.at("failed.json"))).toMatchObject({ exitCode: 3, result: { status: "failed" } });
    expect(box.json("failed.json")).toMatchSnapshot();
    expect(failed).toMatchSnapshot();
  });
});
