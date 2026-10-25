import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata, resource } from "#/xrf-cli/test/constants";
import { ENGINE_MATERIALS, writeGameMaterials } from "#/xrf-cli/test/game-materials";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const MESH = "meshes/ogf/notes_paper_1.ogf";

/**
 * The checks that resolve what a game material library names or is named by: a mesh's bone material, and the
 * particles and sounds material pairs play.
 */
describe("gamedata verify material usage", () => {
  const box = new Sandbox(__filename);

  let result: CliResult;

  beforeAll(() => {
    // The paper's one bone is made of `objects\clothes`, which this library holds as static.
    writeGameMaterials(
      box.at("tree/gamemtl.xr"),
      [...ENGINE_MATERIALS, { id: 5, name: "objects\\clothes" }],
      [
        {
          id: 0,
          materials: [0, 1],
          stepSounds: "weapons\\no_sound, weapons\\missing",
          collideParticles: "_samples_particles_\\distort_01,missing_particle",
        },
        { id: 1, materials: [1, 1], stepSounds: "weapons\\missing" },
      ]
    );
    box.copyIn(gamedata("shaders.xr"), "tree/shaders.xr");
    box.copyIn(gamedata("particles.xr"), "tree/particles.xr");
    box.copyIn(gamedata(MESH), `tree/${MESH}`);
    box.copyIn(gamedata("textures/ui_empty.dds"), "tree/textures/item/item_notes.dds");
    box.copyIn(resource("sounds/no_sound.ogg"), "tree/sounds/weapons/no_sound.ogg");
    box.write("tree/configs/system.ltx", "");

    result = box.run(
      "gamedata verify",
      ["--path", box.at("tree"), "--checks", "meshes", "particles-usage", "sounds", "--report", box.at("report.json")],
      { expectExit: 3 }
    );
  });

  it("should report a bone made of a static material, a missing pair particle and a missing pair sound", () => {
    expect(result).toMatchSnapshot();
    expect(box.json("report.json")).toMatchObject({
      exitCode: 3,
      result: {
        status: "failed",
        checks: [
          { id: "coverage" },
          { id: "collisions" },
          {
            id: "meshes",
            status: "failed",
            findings: [
              {
                ruleId: "meshes.game-material",
                subject: MESH,
                message: expect.stringContaining(
                  "is made of static game material 'objects\\clothes', and the engine asserts a bone's is dynamic"
                ),
              },
            ],
          },
          {
            id: "particles-usage",
            status: "failed",
            summary: "1/2 particle references valid; 0/0 spawn files readable; 0 custom data sections unparsed",
            findings: [
              {
                ruleId: "particles-usage.reference",
                subject: "gamemtl.xr",
                message: "Unknown particle reference: collide particles of 1 pairs = missing_particle",
              },
            ],
          },
          {
            id: "sounds",
            status: "failed",
            summary: "1/1 sounds valid; 1/2 sound references valid",
            findings: [
              {
                ruleId: "sounds.references",
                subject: "gamemtl.xr",
                message: "Unknown sound reference: step sounds of 2 pairs = weapons\\missing",
              },
            ],
          },
        ],
      },
    });
  });

  it("should record the report as a readable document", () => {
    expect(box.json("report.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
