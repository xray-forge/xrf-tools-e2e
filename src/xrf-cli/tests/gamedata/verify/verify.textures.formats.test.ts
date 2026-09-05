import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type ManifestFile } from "#/xrf-cli/test/sandbox";

describe("gamedata verify DDS format compatibility", () => {
  const box = new Sandbox(__filename);

  let inputs: Array<ManifestFile>;

  beforeAll(() => {
    // Reuse the legacy 4x4 header, then append a DX10 header and one eight-byte block. BC1 and BC4 have the same
    // block size: only DXGI format 71 (BC1_UNORM) versus 80 (BC4_UNORM) changes between these readable files.
    const texture = Buffer.alloc(156);

    fs.readFileSync(gamedata("textures/ui_empty.dds")).copy(texture, 0, 0, 128);
    texture.writeUInt32LE(8, 20);
    texture.write("DX10", 84, "ascii");
    texture.writeUInt32LE(71, 128);
    texture.writeUInt32LE(3, 132); // D3D10_RESOURCE_DIMENSION_TEXTURE2D.
    texture.writeUInt32LE(1, 140); // One array element.
    box.write("supported/configs/system.ltx", "");
    box.write("supported/textures/format.dds", "");
    fs.writeFileSync(box.at("supported/textures/format.dds"), texture);
    box.copyIn(box.at("supported"), "unsupported");
    texture.writeUInt32LE(80, 128);
    fs.writeFileSync(box.at("unsupported/textures/format.dds"), texture);
    inputs = box.manifest();

    box.run("gamedata verify", [box.at("supported"), "--checks", "textures", "--report", box.at("supported.json")]);
    box.run(
      "gamedata verify",
      [box.at("unsupported"), "--checks", "textures", "--report", box.at("unsupported.json")],
      {
        expectExit: 3,
      }
    );
  });

  it("should accept a readable BC1 texture", () => {
    expect(box.json("supported.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        status: "passed",
        checks: [
          { verificationType: "coverage", status: "skipped", findings: [] },
          { verificationType: "collisions", status: "skipped", findings: [] },
          {
            verificationType: "textures",
            status: "passed",
            summary: "1/1 textures valid; 0/0 declared bumps resolved",
            findings: [],
          },
        ],
      },
    });
  });

  it("should report unsupported BC4 as validation rather than a read error", () => {
    expect(box.json("unsupported.json")).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        status: "failed",
        checks: [
          { verificationType: "coverage", status: "skipped", findings: [] },
          { verificationType: "collisions", status: "skipped", findings: [] },
          {
            verificationType: "textures",
            status: "failed",
            summary: "0/1 textures valid; 0/0 declared bumps resolved",
            findings: [
              {
                assetPath: "textures/format.dds",
                ruleId: "textures.dds",
                message: "Texture uses an unsupported format",
              },
            ],
          },
        ],
      },
    });
  });

  it("should preserve both complete texture inputs", () => {
    expect(box.manifest().filter((file) => !["supported.json", "unsupported.json"].includes(file.path))).toEqual(
      inputs
    );
  });

  it("should record the reports and expected artifacts", () => {
    expect(box.json("supported.json")).toMatchSnapshot();
    expect(box.json("unsupported.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["supported.json", "unsupported.json"] })).toMatchSnapshot();
  });
});
