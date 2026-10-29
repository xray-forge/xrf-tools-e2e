import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";
import { writeTextureDescriptor } from "#/xrf-cli/test/texture-descriptor";

const SHEET_DDS = gamedata("textures/ui/ui_test_sheet.dds");

/**
 * Comparing each texture descriptor's bump with its diffuse, the sets built through the tool itself.
 */
describe("thm bump-alignment report", () => {
  const box = new Sandbox(__filename);
  const reports: Array<string> = ["aligned.json", "narrowed.json"];

  let verbose: CliResult;
  let usage: CliResult;

  beforeAll(() => {
    // A bump drawn from its own diffuse, as the SDK draws one from a height map.
    box.copyIn(SHEET_DDS, "root/textures/sheet.dds");
    box.run("dds make-bump", ["--path", box.at("root/textures/sheet.dds"), "--dest", box.at("root/textures/sheet")]);
    writeTextureDescriptor(box.at("root/textures/sheet.thm"), { bump: "sheet_bump" });

    // Another picture borrowing the sheet's relief: the right half of the sheet, stretched over the whole.
    box.run("dds crop", [
      ...["--path", SHEET_DDS, "--dest", box.at("root/textures/props/patch.dds")],
      ...["--x", "128", "--y", "0", "--width", "128", "--height", "64", "--fit-width", "256", "--fit-height", "64"],
    ]);
    writeTextureDescriptor(box.at("root/textures/props/patch.thm"), { bump: "sheet_bump" });

    // A descriptor whose texture is gone, and one whose bump never was.
    writeTextureDescriptor(box.at("root/textures/props/removed.thm"), { bump: "sheet_bump" });
    box.copyIn(SHEET_DDS, "root/textures/props/lost.dds");
    writeTextureDescriptor(box.at("root/textures/props/lost.thm"), { bump: "props\\lost_bump" });

    verbose = box.run("thm bump-alignment", [
      ...["--path", box.at("root"), "--source", "directory"],
      ...["--verbose", "--report", box.at("aligned.json")],
    ]);
    box.run("thm bump-alignment", [
      ...["--path", box.at("root"), "--source", "directory", "--prefix", "textures\\props"],
      ...["--report", box.at("narrowed.json")],
    ]);
    usage = box.run("thm bump-alignment", ["--source", "nowhere"], { expectExit: 2 });
  });

  it("should find a bump drawn from its own diffuse aligned", () => {
    expect(envelopeAt(box.at("aligned.json"))).toMatchObject({
      exitCode: 0,
      result: {
        summary: { descriptors: 4, sets: 4, measured: 2, missingDiffuses: 1, missingBumps: 1, borrowed: 2 },
        sets: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "textures\\sheet.thm",
            diffuse: "textures\\sheet.dds",
            bumpFile: "textures\\sheet_bump.dds",
            isBorrowed: false,
            status: "measured",
            alignment: expect.objectContaining({ verdict: "aligned" }),
          }),
        ]),
      },
    });
    expect(box.json("aligned.json")).toMatchSnapshot();
  });

  it("should tell a borrowed bump, a removed texture and a missing bump apart", () => {
    const sets = (envelopeAt(box.at("aligned.json")) as { result: { sets: Array<Record<string, unknown>> } }).result
      .sets;

    expect(sets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ descriptor: "textures\\props\\patch.thm", isBorrowed: true, status: "measured" }),
        expect.objectContaining({ descriptor: "textures\\props\\removed.thm", status: "missingDiffuse" }),
        expect.objectContaining({ descriptor: "textures\\props\\lost.thm", status: "missingBump" }),
      ])
    );
    expect(verbose).toMatchSnapshot();
  });

  it("should narrow the descriptors to a prefix and still find a bump outside it", () => {
    expect(envelopeAt(box.at("narrowed.json"))).toMatchObject({
      exitCode: 0,
      result: {
        summary: { descriptors: 3, sets: 3, measured: 1 },
        sets: expect.arrayContaining([
          expect.objectContaining({ descriptor: "textures\\props\\patch.thm", bumpFile: "textures\\sheet_bump.dds" }),
        ]),
      },
    });
  });

  it("should refuse a mount mode it does not know", () => {
    expect(usage).toMatchSnapshot();
  });

  it("should write the bump pair and only the requested reports", () => {
    expect(box.manifest({ normalized: reports })).toMatchSnapshot();
  });
});
