import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * `object compile` of SDK `.object` files into a static OGF and a `.dm` detail model, its refusal of an output already
 * there, and a forced compile over it.
 *
 * The objects are `levels/chain`'s: the metre box the scene places and the grass its details plant. The `.dm` is then
 * decompiled and compiled again, which gives back the same bytes.
 */
describe("object compile", () => {
  const box = new Sandbox(__filename);
  const objects: string = resource("levels/chain/rawdata/objects");

  let visual: CliResult;
  let detail: CliResult;
  let refused: CliResult;
  let forced: CliResult;

  let compiled: string;
  let held: string;
  let afterRefusal: string;

  beforeAll(() => {
    const boxObject: string = `${objects}/levels/chain/box.object`;

    visual = box.run("object compile", [boxObject, "--dest", box.at("out/box.ogf"), "--report", box.at("box.json")]);
    compiled = box.sha("out/box.ogf");

    detail = box.run("object compile", [
      `${objects}/detail/grass.object`,
      "--dest",
      box.at("out/grass.dm"),
      "--report",
      box.at("grass.json"),
    ]);
    box.run("object decompile", [box.at("out/grass.dm"), "--dest", box.at("back/grass.object")]);
    box.run("object compile", [box.at("back/grass.object"), "--dest", box.at("back/grass.dm")]);

    box.write("out/box.ogf", "edited by hand");
    held = box.sha("out/box.ogf");

    refused = box.run(
      "object compile",
      [boxObject, "--dest", box.at("out/box.ogf"), "--report", box.at("refused.json")],
      { expectExit: 1 }
    );
    afterRefusal = box.sha("out/box.ogf");

    forced = box.run("object compile", [boxObject, "--dest", box.at("out/box.ogf"), "--force"]);
  });

  it("should compile an object into a static visual", () => {
    expect(envelopeAt(box.at("box.json"))).toMatchObject({
      exitCode: 0,
      result: { children: 1, vertices: 20, faces: 10, droppedFaces: 0, bones: 0, tangents: null },
    });
    expect(box.json("box.json")).toMatchSnapshot();
    expect(visual).toMatchSnapshot();
  });

  it("should compile an object into a detail model where the destination is a .dm", () => {
    expect(envelopeAt(box.at("grass.json"))).toMatchObject({
      exitCode: 0,
      result: { children: 1, vertices: 8, faces: 4, droppedFaces: 0, bones: 0 },
    });
    expect(detail).toMatchSnapshot();
  });

  it("should give the detail model's bytes back through a decompile and a compile", () => {
    expect(box.sha("back/grass.dm")).toBe(box.sha("out/grass.dm"));
  });

  it("should refuse an output already there unforced, writing nothing", () => {
    expect(envelopeAt(box.at("refused.json"))).toMatchObject({
      exitCode: 1,
      error: expect.stringContaining("box.ogf"),
    });
    expect(refused).toMatchSnapshot();
    expect(afterRefusal).toBe(held);
  });

  it("should replace the output forced", () => {
    expect(forced).toMatchSnapshot();
    expect(box.sha("out/box.ogf")).toBe(compiled);
  });

  it("should write the models and only the requested reports", () => {
    expect(
      box
        .manifest({ normalized: ["box.json", "grass.json", "refused.json"] })
        .map((file) => (file.path.endsWith(".xrf.json") ? { path: file.path } : file))
    ).toMatchSnapshot();
  });
});
