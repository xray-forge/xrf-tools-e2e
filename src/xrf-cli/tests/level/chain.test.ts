import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { ENGINE_MATERIALS, writeGameMaterials } from "#/xrf-cli/test/game-materials";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Every compiler of the chain on one level: a Level Editor scene built with `level build`, compiled with
 * `level compile` by every step, checked with `level verify`, and its root spawn built with `spawn build`.
 *
 * `levels/chain` is a synthetic scene and the game data beside it: a 12 m ground under a lightmapped compiler shader,
 * two metre boxes under a vertex-lit one, a point light, a grid of 2 m detail slots planting one grass object (one slot
 * left bare), a flat AI map of 221 nodes around the boxes, and an actor with two graph points. The game material
 * library is written here, the engine's own materials.
 *
 * Every compile asks for the CPU, the reference, at draft quality. The light, details and AI covers are traced, so
 * their bytes are not recorded: a second compile of the same build is held to the first's bytes instead, and the
 * recording keeps each file's size alone.
 */
describe("level chain", () => {
  const box = new Sandbox(__filename);
  const level: string = box.at("gamedata/levels/chain");
  const again: string = box.at("again/levels/chain");

  let build: CliResult;
  let compile: CliResult;
  let verify: CliResult;
  let spawn: CliResult;
  let spawnVerify: CliResult;

  const compiled = (directory: string, report: string, jobs: string): CliResult =>
    box.run("level compile", [
      "--path",
      directory,
      "--steps",
      "geometry,light,details,ai",
      "--quality",
      "draft",
      "--backend",
      "cpu",
      "--gamedata",
      box.at("gamedata"),
      "-j",
      jobs,
      "--report",
      box.at(report),
    ]);

  beforeAll(() => {
    box.copyIn(resource("levels/chain/rawdata"), "rawdata");
    box.copyIn(resource("levels/chain/gamedata"), "gamedata");
    writeGameMaterials(box.at("gamedata/gamemtl.xr"), ENGINE_MATERIALS);

    // No --textures: the build reads gamedata/textures beside the rawdata, where a decompile writes them.
    build = box.run("level build", [
      "--path",
      box.at("rawdata/levels/chain.level"),
      "--dest",
      level,
      "--game-materials",
      box.at("gamedata/gamemtl.xr"),
      "--report",
      box.at("build.json"),
    ]);
    fs.cpSync(level, again, { recursive: true });

    // The same build compiled on every worker and on one gives the same bytes.
    compile = compiled(level, "compile.json", "auto");
    compiled(again, "compile-again.json", "1");
    verify = box.run("level verify", ["--path", level, "--report", box.at("verify.json")]);
    spawn = box.run("spawn build", [
      "--gamedata",
      box.at("gamedata"),
      "--dest",
      box.at("gamedata/spawns/chain.spawn"),
      "-j",
      "1",
      "--start",
      "chain",
      "--report",
      box.at("spawn.json"),
    ]);
    box.run("spawn info", ["--path", box.at("gamedata/spawns/chain.spawn"), "--report", box.at("spawn-info.json")]);
    spawnVerify = box.run("spawn verify", [
      "--path",
      box.at("gamedata/spawns/chain.spawn"),
      "--report",
      box.at("spawn-verify.json"),
    ]);
  });

  it("should build the scene into the compiler's files and the game's", () => {
    expect(envelopeAt(box.at("build.json"))).toMatchObject({
      exitCode: 0,
      result: {
        files: [
          { name: "build.aimap", previous: "new" },
          { name: "build.details", previous: "new" },
          { name: "build.prj", previous: "new" },
          { name: "build_details.dds", previous: "new" },
          { name: "level.env_mod", previous: "new" },
          { name: "level.fog_vol", previous: "new" },
          { name: "level.game", previous: "new" },
          { name: "level.ltx", previous: "new" },
          { name: "level.spawn", previous: "new" },
        ],
        geometry: {
          staticObjects: 3,
          faces: 22,
          invalidFaces: 0,
          skippedFaces: 0,
          dynamicLights: 2,
          detailObjects: 1,
          detailTextures: 1,
          aiMapNodes: 221,
        },
        refused: [],
      },
    });
    expect(build).toMatchSnapshot();
  });

  it("should compile every step on the CPU", () => {
    expect(envelopeAt(box.at("compile.json"))).toMatchObject({
      exitCode: 0,
      result: {
        steps: [
          {
            step: "geometry",
            run: { kind: "geometryCompiler", census: { visuals: 2, triangles: 24, sectors: 1, trees: 0 } },
          },
          { step: "light", run: { kind: "lightBaker", gpu: null, census: { charts: 1, lightmaps: 1 } } },
          {
            step: "details",
            run: { kind: "detailLighter", gpu: null, slots: { lit: 15, unplanted: 1, emptied: 0, untouched: 0 } },
          },
          {
            step: "ai",
            run: {
              kind: "aiMapCompiler",
              covers: "full",
              gpu: null,
              guid: "derived",
              census: { nodes: 221, links: 812, components: 1, oneWayNodes: 0, selfLinks: 0 },
              graph: { status: "passed" },
            },
          },
        ],
      },
    });
    expect(compile).toMatchSnapshot();
  });

  it("should compile the same build to the same bytes", () => {
    const files: Array<string> = fs.readdirSync(level).sort();

    expect(fs.readdirSync(again).sort()).toEqual(files);

    for (const file of files) {
      expect([file, box.sha(`again/levels/chain/${file}`)]).toEqual([file, box.sha(`gamedata/levels/chain/${file}`)]);
    }
  });

  it("should read the compiled level back, lightmapped and vertex-lit geometry and its AI map passing", () => {
    expect(envelopeAt(box.at("verify.json"))).toMatchObject({
      exitCode: 0,
      result: {
        status: "passed",
        census: {
          visuals: 3,
          drawableVisuals: 2,
          sectors: 1,
          portals: 0,
          lights: 2,
          hasSun: true,
          layouts: { lightmapped: 1, vertexLit: 1 },
          bounds: { min: { x: -6, y: 0, z: -6 }, max: { x: 6, y: 1, z: 6 } },
        },
        aiCensus: { nodes: 221, links: 812, components: 1 },
      },
    });
    expect(verify).toMatchSnapshot();
  });

  it("should build the level's root spawn and read it back", () => {
    expect(envelopeAt(box.at("spawn.json"))).toMatchObject({
      exitCode: 0,
      result: { levels: ["chain"], objects: 1, artefactPoints: 0, patrols: 0, report: { status: "passed" } },
    });
    expect(envelopeAt(box.at("spawn-info.json"))).toMatchObject({
      exitCode: 0,
      result: { kind: "root", levels: 1, objects: 1, graph: { vertices: 2, edges: 2 } },
    });
    expect(envelopeAt(box.at("spawn-verify.json"))).toMatchObject({ exitCode: 0 });
    // Its GUIDs are not recorded: they hash the level's AI map, whose covers are traced.
    expect(spawn).toMatchSnapshot();
    expect(spawnVerify).toMatchSnapshot();
  });

  it("should write the level's files and the spawn", () => {
    const sizes = box
      .manifest()
      .filter((file) => !file.path.endsWith(".json") && !file.path.startsWith("again/"))
      .map((file) => ({ path: file.path, size: file.size }));

    expect(sizes).toMatchSnapshot();
  });
});
