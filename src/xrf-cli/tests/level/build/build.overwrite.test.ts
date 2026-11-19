import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { ENGINE_MATERIALS, writeGameMaterials } from "#/xrf-cli/test/game-materials";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * `level build` over a level directory that already holds its files: refused before the scene is read unless forced,
 * and forced, each file replaced and the build's own files it no longer writes removed.
 *
 * `levels/chain`'s scene is built once into an empty directory. A hand-edited `level.game`, a stale `level.snd_static`
 * the scene holds no sounds for, and a file of the user's own are then put beside the build.
 */
describe("level build overwrite", () => {
  const box = new Sandbox(__filename);
  const level: string = box.at("gamedata/levels/chain");

  let first: CliResult;
  let refused: CliResult;
  let unread: CliResult;
  let forced: CliResult;

  const BUILT: Array<string> = [
    "build.aimap",
    "build.details",
    "build.prj",
    "build_details.dds",
    "level.env_mod",
    "level.fog_vol",
    "level.game",
    "level.ltx",
    "level.spawn",
  ];

  const hashes = (): Record<string, string> =>
    Object.fromEntries(
      fs
        .readdirSync(level)
        .sort()
        .map((file) => [file, box.sha(`gamedata/levels/chain/${file}`)])
    );

  let built: Record<string, string>;
  let held: Record<string, string>;
  let afterRefusals: Record<string, string>;

  const build = (scene: string, report: string, extra: Array<string> = [], expectExit: number = 0): CliResult =>
    box.run(
      "level build",
      [scene, "--dest", level, "--game-materials", box.at("gamedata/gamemtl.xr"), "--report", box.at(report), ...extra],
      { expectExit }
    );

  beforeAll(() => {
    box.copyIn(resource("levels/chain/rawdata"), "rawdata");
    box.copyIn(resource("levels/chain/gamedata"), "gamedata");
    writeGameMaterials(box.at("gamedata/gamemtl.xr"), ENGINE_MATERIALS);

    first = build(box.at("rawdata/levels/chain.level"), "first.json");
    built = hashes();

    box.write("gamedata/levels/chain/level.game", "edited by hand");
    box.write("gamedata/levels/chain/level.snd_static", "an earlier build's sounds");
    box.write("gamedata/levels/chain/notes.txt", "the user's own");
    held = hashes();

    refused = build(box.at("rawdata/levels/chain.level"), "refused.json", [], 1);
    // A scene that is not there: the refusal comes first, so it names the held files rather than the scene.
    unread = build(box.at("rawdata/levels/missing.level"), "unread.json", [], 1);
    afterRefusals = hashes();

    forced = build(box.at("rawdata/levels/chain.level"), "forced.json", ["--force"]);
  });

  it("should build into an empty directory", () => {
    expect(envelopeAt(box.at("first.json"))).toMatchObject({
      exitCode: 0,
      result: { files: BUILT.map((name) => ({ name, previous: "new" })), removed: [], refused: [] },
    });
    expect(first).toMatchSnapshot();
  });

  it("should refuse a directory holding the build's files unforced, naming them", () => {
    expect(envelopeAt(box.at("refused.json"))).toMatchObject({
      exitCode: 1,
      error: expect.stringContaining(
        "already holds what this run writes (level.env_mod, level.fog_vol, level.game, level.snd_static, level.spawn, " +
          "5 more); force it to replace them"
      ),
    });
    expect(refused).toMatchSnapshot();
  });

  it("should refuse before reading the scene", () => {
    expect(envelopeAt(box.at("unread.json"))).toMatchObject({
      exitCode: 1,
      error: expect.stringContaining("already holds what this run writes"),
    });
    expect(unread).toMatchSnapshot();
  });

  it("should leave every file as it was when refused", () => {
    expect(afterRefusals).toEqual(held);
  });

  it("should replace the files forced, removing its own stale file and keeping the user's", () => {
    expect(envelopeAt(box.at("forced.json"))).toMatchObject({
      exitCode: 0,
      result: {
        files: BUILT.map((name) => ({ name, previous: name === "level.game" ? "changed" : "same" })),
        removed: ["level.snd_static"],
        refused: [],
      },
    });
    expect(forced).toMatchSnapshot();
    expect(hashes()).toEqual({ ...built, "notes.txt": held["notes.txt"] });
  });

  it("should write the build's files and only the requested reports", () => {
    expect(
      box
        .manifest({ normalized: ["first.json", "refused.json", "unread.json", "forced.json"] })
        .filter((file) => file.path.endsWith(".json") || file.path.startsWith("gamedata/levels/"))
    ).toMatchSnapshot();
  });
});
