import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const MESH = "meshes/ogf/notes_paper_1.ogf";
const TEXTURE = "textures/item/item_notes.dds";
const SOURCE_TEXTURE = "textures/ui_empty.dds";

describe("gamedata verify mesh texture references", () => {
  const box = new Sandbox(__filename);

  let present: CliResult;
  let missing: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    for (const root of ["present", "missing"]) {
      box.copyIn(gamedata("shaders.xr"), `${root}/shaders.xr`);
      box.copyIn(gamedata(MESH), `${root}/${MESH}`);
      // Opening a project requires its ordinary config entry point even when only meshes are selected.
      box.write(`${root}/configs/system.ltx`, "[section]\r\nvalue = 1\r\n");
    }

    // The verifier checks a mesh texture reference by its resolved DDS path, not by matching texture bytes to an OGF.
    // A compact valid DDS is therefore enough to make this mesh's real reference available.
    box.copyIn(gamedata(SOURCE_TEXTURE), `present/${TEXTURE}`);
    inputsBefore = box
      .manifest()
      .filter((file) => file.path.startsWith("present/") || file.path.startsWith("missing/"));

    present = box.run(
      "gamedata verify",
      [box.at("present"), "--checks", "meshes", "--report", box.at("present.json")],
      { expectExit: 0 }
    );
    missing = box.run(
      "gamedata verify",
      [box.at("missing"), "--checks", "meshes", "--report", box.at("missing.json")],
      { expectExit: 3 }
    );
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("present/") || file.path.startsWith("missing/"));
  });

  it("should accept a mesh whose referenced texture resolves", () => {
    expect(present).toMatchSnapshot();
    expect(box.json("present.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        checks: [
          { findings: [], status: "skipped", summary: "Every declared source opened", verificationType: "coverage" },
          { findings: [], status: "skipped", summary: "No unreachable files", verificationType: "collisions" },
          {
            findings: [],
            status: "passed",
            summary: "1/1 shader libraries valid, 205 blender definitions; 1/1 meshes valid",
            verificationType: "meshes",
          },
        ],
        status: "passed",
      },
    });
  });

  it("should report the missing referenced texture once at its mesh in check order", () => {
    expect(missing).toMatchSnapshot();
    expect(missing.stdout).toContain(
      "Verified gamedata meshes in <duration>, 1/1 shader libraries valid, 205 blender definitions; 0/1 meshes valid"
    );
    expect(missing.stderr).toContain("Check failed: 1 finding(s)");
    expect(box.json("missing.json")).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        checks: [
          { findings: [], status: "skipped", summary: "Every declared source opened", verificationType: "coverage" },
          { findings: [], status: "skipped", summary: "No unreachable files", verificationType: "collisions" },
          {
            findings: [
              {
                assetPath: MESH,
                message: "Mesh references missing texture 'item\\item_notes'",
                ruleId: "meshes.validation",
              },
            ],
            status: "failed",
            summary: "1/1 shader libraries valid, 205 blender definitions; 0/1 meshes valid",
            verificationType: "meshes",
          },
        ],
        status: "failed",
      },
    });
  });

  it("should preserve every staged input in both roots", () => {
    expect(inputsAfter).toEqual(inputsBefore);
  });

  it("should record each report as a readable document", () => {
    expect(box.json("present.json")).toMatchSnapshot();
    expect(box.json("missing.json")).toMatchSnapshot();
  });

  it("should write only its fixture and reports", () => {
    expect(box.manifest({ normalized: ["present.json", "missing.json"] })).toMatchSnapshot();
  });
});
