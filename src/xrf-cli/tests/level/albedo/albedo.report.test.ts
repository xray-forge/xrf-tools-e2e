import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Measuring a level's base textures as albedo, found through mounted roots as the renderer finds them.
 */
describe("level albedo report", () => {
  const box = new Sandbox(__filename);
  const reports: Array<string> = ["measured.json", "missing.json", "directory.json"];

  let verbose: CliResult;
  let missing: CliResult;
  let usage: CliResult;

  beforeAll(() => {
    // `triangle` dresses both its surfaces with `stone`, once lightmapped; the shared tree holds it.
    box.copyIn(resource("levels/triangle"), "root/levels/triangle");
    box.copyIn(resource("gamedata/textures/ui/ui_test_sheet.dds"), "root/textures/stone.dds");
    box.copyIn(resource("levels/triangle"), "bare/levels/triangle");

    verbose = box.run("level albedo", [
      ...["--root", box.at("root"), "--level", "triangle", "--source", "directory"],
      ...["--verbose", "--report", box.at("measured.json")],
    ]);
    missing = box.run("level albedo", [
      ...["--root", box.at("bare"), "--level", "triangle", "--source", "directory"],
      ...["--report", box.at("missing.json")],
    ]);
    box.run("level albedo", ["--path", box.at("root/levels/triangle"), "--report", box.at("directory.json")], {
      expectExit: 1,
    });
    usage = box.run("level albedo", [], { expectExit: 2 });
  });

  it("should measure each base texture once, naming the shaders drawing it", () => {
    expect(envelopeAt(box.at("measured.json"))).toMatchObject({
      exitCode: 0,
      result: {
        level: "levels\\triangle",
        summary: { surfaces: 2, unlitSurfaces: 0, textures: 1, measured: 1 },
        textures: [
          {
            reference: "stone",
            file: "textures\\stone.dds",
            shaders: ["default"],
            alphaReference: null,
            status: "measured",
          },
        ],
      },
    });
    expect(box.json("measured.json")).toMatchSnapshot();
  });

  it("should list each texture's measure in verbose output", () => {
    expect(verbose).toMatchSnapshot();
  });

  it("should report a texture no root holds as missing rather than failing", () => {
    expect(envelopeAt(box.at("missing.json"))).toMatchObject({
      exitCode: 0,
      result: {
        summary: { textures: 1, measured: 0 },
        textures: [{ reference: "stone", file: null, status: "missing" }],
      },
    });
    expect(missing).toMatchSnapshot();
  });

  it("should refuse a level directory, which holds no textures to resolve", () => {
    expect(envelopeAt(box.at("directory.json"))).toMatchObject({ exitCode: 1, error: expect.any(String) });
    expect(box.json("directory.json")).toMatchSnapshot();
  });

  it("should require a level", () => {
    expect(usage).toMatchSnapshot();
  });

  it("should write only the requested reports", () => {
    expect(box.manifest({ normalized: reports })).toMatchSnapshot();
  });
});
