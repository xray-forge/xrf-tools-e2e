import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * `object decompile` of a skeleton OGF into an SDK `.object` with its provenance sidecar, its refusal of an object
 * already there, and a forced decompile over it.
 *
 * `dev_bolt_hud.ogf` is the corpus's two-bone HUD skeleton. A sidecar names the binary's version and the time it was
 * written, so those two members are masked before it is recorded, and its bytes are kept out of the manifest.
 */
describe("object decompile", () => {
  const box = new Sandbox(__filename);
  const source: string = gamedata("meshes/ogf/dev_bolt_hud.ogf");
  const object: string = box.at("objects/bolt.object");

  let first: CliResult;
  let refused: CliResult;
  let forced: CliResult;

  let decompiled: string;
  let held: Array<string>;
  let afterRefusal: Array<string>;

  const hashes = (): Array<string> => [box.sha("objects/bolt.object"), box.sha("objects/bolt.object.xrf.json")];

  const decompile = (report: string, extra: Array<string> = [], expectExit: number = 0): CliResult =>
    box.run("object decompile", [source, "--dest", object, "--report", box.at(report), ...extra], { expectExit });

  beforeAll(() => {
    first = decompile("first.json");
    decompiled = box.sha("objects/bolt.object");

    box.write("objects/bolt.object", "edited by hand");
    box.write("objects/bolt.object.xrf.json", "{}");
    held = hashes();

    refused = decompile("refused.json", [], 1);
    afterRefusal = hashes();

    forced = decompile("forced.json", ["--force"]);
  });

  it("should decompile the skeleton into an object", () => {
    expect(envelopeAt(box.at("first.json"))).toMatchObject({
      exitCode: 0,
      result: { surfaces: 1, points: 98, faces: 192, twoSidedFaces: 0, bones: 2 },
    });
    expect(box.json("first.json")).toMatchSnapshot();
    expect(first).toMatchSnapshot();
  });

  it("should record where the object came from beside it", () => {
    expect({
      ...(box.json("objects/bolt.object.xrf.json") as Record<string, unknown>),
      decompiledAt: "<time>",
      toolVersion: "<version>",
    }).toMatchSnapshot();
  });

  it("should refuse an object already there unforced, writing nothing", () => {
    expect(envelopeAt(box.at("refused.json"))).toMatchObject({
      exitCode: 1,
      error: expect.stringContaining("bolt.object"),
    });
    expect(refused).toMatchSnapshot();
    expect(afterRefusal).toEqual(held);
  });

  it("should replace the object and its sidecar forced", () => {
    expect(envelopeAt(box.at("forced.json"))).toMatchObject({ exitCode: 0 });
    expect(forced).toMatchSnapshot();
    expect(box.sha("objects/bolt.object")).toBe(decompiled);
    expect(box.text("objects/bolt.object.xrf.json")).not.toEqual(["{}"]);
  });

  it("should write the object, its sidecar and only the requested reports", () => {
    expect(
      box
        .manifest({ normalized: ["first.json", "refused.json", "forced.json"] })
        .map((file) => (file.path.endsWith(".xrf.json") ? { path: file.path } : file))
    ).toMatchSnapshot();
  });
});
