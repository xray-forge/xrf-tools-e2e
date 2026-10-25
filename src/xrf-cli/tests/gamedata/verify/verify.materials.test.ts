import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import {
  DYNAMIC_MATERIAL_FLAG,
  ENGINE_MATERIALS,
  type IGameMaterial,
  writeGameMaterials,
} from "#/xrf-cli/test/game-materials";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const EARTH: IGameMaterial = { id: 5, name: "materials\\earth" };
const MEDIUM_CREATURE: IGameMaterial = { id: 6, name: "creatures\\medium", flags: DYNAMIC_MATERIAL_FLAG };

describe("gamedata verify materials", () => {
  const box = new Sandbox(__filename);

  let valid: CliResult;
  let broken: CliResult;
  let absent: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    writeGameMaterials(
      box.at("valid/gamemtl.xr"),
      [...ENGINE_MATERIALS, EARTH, MEDIUM_CREATURE],
      [{ id: 0, materials: [5, 6], stepSounds: "a,b,c,d,e,f", collideMarks: "wm\\wm_hit" }]
    );
    box.copyIn(gamedata("textures/ui_empty.dds"), "valid/textures/wm/wm_hit.dds");
    box.write("valid/configs/system.ltx", "[m_dog]\r\nmaterial = Creatures\\Medium\r\n");

    // The knife missing, the default object static, a pair naming a material nothing defines with one step sound too
    // many and a missing wallmark, and a monster made of a material nothing defines.
    writeGameMaterials(
      box.at("broken/gamemtl.xr"),
      [
        ...ENGINE_MATERIALS.filter((material) => material.name !== "objects\\knife").map((material) => ({
          ...material,
          flags: 0,
        })),
        EARTH,
        MEDIUM_CREATURE,
      ],
      [{ id: 0, materials: [5, 42], stepSounds: "a,b,c,d,e,f,g", collideMarks: "wm\\missing" }]
    );
    box.write("broken/configs/system.ltx", "[m_dog]\r\nmaterial = creatures\\unknown\r\n");

    box.write("absent/configs/system.ltx", "");

    inputsBefore = box.manifest();

    valid = box.run("gamedata verify", [
      "--path",
      box.at("valid"),
      "--checks",
      "materials",
      "--report",
      box.at("valid.json"),
    ]);
    broken = box.run(
      "gamedata verify",
      ["--path", box.at("broken"), "--checks", "materials", "--report", box.at("broken.json")],
      { expectExit: 3 }
    );
    absent = box.run(
      "gamedata verify",
      ["--path", box.at("absent"), "--checks", "materials", "--report", box.at("absent.json")],
      { expectExit: 3 }
    );

    inputsAfter = box.manifest().filter((file) => !file.path.endsWith(".json"));
  });

  it("should pass a library the engine loads and a config naming one of its materials in any case", () => {
    expect(valid).toMatchSnapshot();
    expect(box.json("valid.json")).toMatchObject({
      exitCode: 0,
      result: {
        status: "passed",
        checks: [
          { id: "coverage", status: "skipped", findings: [] },
          { id: "collisions", status: "skipped", findings: [] },
          {
            id: "materials",
            status: "passed",
            summary: "7 materials, 1 pairs; 9/9 material references valid",
            findings: [],
          },
        ],
      },
    });
  });

  it("should report each engine assertion the library and the configs would raise", () => {
    expect(broken).toMatchSnapshot();
    expect(box.json("broken.json")).toMatchObject({
      exitCode: 3,
      result: {
        status: "failed",
        checks: [
          { id: "coverage", status: "skipped", findings: [] },
          { id: "collisions", status: "skipped", findings: [] },
          {
            id: "materials",
            status: "failed",
            summary: "6 materials, 1 pairs; 4/9 material references valid",
            findings: [
              {
                ruleId: "materials.reference",
                subject: "configs/system.ltx",
                message: "Unknown game material: [m_dog] material = creatures\\unknown",
              },
              {
                ruleId: "materials.engine",
                subject: "gamemtl.xr",
                message:
                  "The engine asserts material 'default_object' is dynamic, and the library defines it as static",
              },
              {
                ruleId: "materials.engine",
                subject: "gamemtl.xr",
                message: "The engine looks up material 'objects\\knife', which the library does not define",
              },
              {
                ruleId: "materials.list",
                subject: "gamemtl.xr",
                message: "Pair materials\\earth - 42 lists 7 step sounds, more than the 6 the engine loads",
              },
              {
                ruleId: "materials.mark",
                subject: "gamemtl.xr",
                message: "Wallmark texture 'wm\\missing' named by 1 pairs is missing",
              },
              {
                ruleId: "materials.pair",
                subject: "gamemtl.xr",
                message: "Pair materials\\earth - 42 names material 42, which the library does not define",
              },
            ],
          },
        ],
      },
    });
  });

  it("should fail a tree holding no library", () => {
    expect(absent).toMatchSnapshot();
    expect(box.json("absent.json")).toMatchObject({
      exitCode: 3,
      result: {
        status: "failed",
        checks: [
          { id: "coverage" },
          { id: "collisions" },
          {
            id: "materials",
            status: "failed",
            summary: "Game material library unreadable",
            findings: [{ ruleId: "materials.library", subject: "gamemtl.xr" }],
          },
        ],
      },
    });
  });

  it("should preserve every staged input", () => {
    expect(inputsAfter).toEqual(inputsBefore);
  });

  it("should record the reports as readable documents", () => {
    expect(box.json("valid.json")).toMatchSnapshot();
    expect(box.json("broken.json")).toMatchSnapshot();
    expect(box.json("absent.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["valid.json", "broken.json", "absent.json"] })).toMatchSnapshot();
  });
});
