import * as fs from "node:fs";
import * as path from "node:path";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { ENGINE_MATERIALS, writeGameMaterials } from "#/xrf-cli/test/game-materials";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * `level decompile` of a compiled level back into a Level Editor scene, its refusal of a scene already there, and a
 * forced decompile over it.
 *
 * The level is `levels/chain`'s scene built with `level build` and compiled by every step on the CPU at draft quality,
 * as `level/chain.test.ts` does. The decompile writes the scene under `scene/rawdata/levels` and its objects under
 * `scene/rawdata/objects`, the default beside the destination; the game materials and compiler shaders are the level's
 * gamedata's, also by default.
 *
 * The light, details and AI covers are traced, so the scene's bytes are not recorded: the forced decompile is held to
 * the first's bytes instead, and the recording keeps each file's size alone. A sidecar names the binary's version, the
 * time and the source's absolute path, so its size is not recorded either.
 */
describe("level decompile", () => {
  const box = new Sandbox(__filename);
  const level: string = box.at("gamedata/levels/chain");
  const scene: string = box.at("scene/rawdata/levels/chain.level");

  const STALE_PART: string = "scene/rawdata/levels/chain/stale.part";
  const STALE_OBJECT: string = "scene/rawdata/objects/levels/chain/chain_stale.object";
  const NOTES: string = "scene/rawdata/objects/levels/chain/notes.txt";

  let first: CliResult;
  let refused: CliResult;
  let forced: CliResult;

  let decompiled: Record<string, string>;
  let held: Record<string, string>;
  let afterRefusal: Record<string, string>;

  // Every file under `scene/`, by sandbox-relative path, to its hash.
  const hashes = (): Record<string, string> =>
    Object.fromEntries(
      (fs.readdirSync(box.at("scene"), { recursive: true, withFileTypes: true }) as Array<fs.Dirent>)
        .filter((entry) => entry.isFile())
        .map((entry) => path.relative(box.root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
        .sort()
        .map((file) => [file, box.sha(file)])
    );

  const isSidecar = (file: string): boolean => file.endsWith(".xrf.json");

  const decompile = (report: string, extra: Array<string> = [], expectExit: number = 0): CliResult =>
    box.run("level decompile", [level, "--dest", scene, "-j", "1", "--report", box.at(report), ...extra], {
      expectExit,
    });

  beforeAll(() => {
    box.copyIn(resource("levels/chain/rawdata"), "rawdata");
    box.copyIn(resource("levels/chain/gamedata"), "gamedata");
    writeGameMaterials(box.at("gamedata/gamemtl.xr"), ENGINE_MATERIALS);

    box.run("level build", [
      box.at("rawdata/levels/chain.level"),
      "--dest",
      level,
      "--game-materials",
      box.at("gamedata/gamemtl.xr"),
    ]);
    box.run("level compile", [
      level,
      "--steps",
      "geometry,light,details,ai",
      "--quality",
      "draft",
      "--backend",
      "cpu",
      "--gamedata",
      box.at("gamedata"),
    ]);

    first = decompile("first.json");
    decompiled = hashes();

    // A part and an object an earlier, larger decompile would have left, and a file of the user's own beside them.
    box.write(STALE_PART, "an earlier decompile's part");
    box.write(STALE_OBJECT, "an earlier decompile's object");
    box.write(NOTES, "the user's own");
    held = hashes();

    refused = decompile("refused.json", [], 1);
    afterRefusal = hashes();

    forced = decompile("forced.json", ["--force"]);
  });

  it("should decompile the compiled level into a scene, its objects and their sidecars", () => {
    expect(envelopeAt(box.at("first.json"))).toMatchObject({ exitCode: 0, result: { removed: [] } });
    expect(box.json("first.json")).toMatchSnapshot();
    expect(first).toMatchSnapshot();
  });

  it("should refuse a scene already there unforced, leaving every file as it was", () => {
    expect(envelopeAt(box.at("refused.json"))).toMatchObject({
      exitCode: 1,
      error: expect.stringContaining("already holds what this run writes (chain.level, chain.level.xrf.json, chain"),
    });
    expect(afterRefusal).toEqual(held);
    // The part files are named below the scene's directory with the host's separator.
    expect({ ...refused, stderr: refused.stderr.map((line) => line.split("\\").join("/")) }).toMatchSnapshot();
  });

  it("should replace the scene forced, removing its own stale part and object and keeping the user's file", () => {
    const after: Record<string, string> = hashes();

    expect(envelopeAt(box.at("forced.json"))).toMatchObject({
      exitCode: 0,
      result: { removed: [box.at(STALE_PART), box.at(STALE_OBJECT)] },
    });
    expect(forced).toMatchSnapshot();

    expect(Object.keys(after)).toEqual([...Object.keys(decompiled), NOTES].sort());
    expect(after[NOTES]).toBe(held[NOTES]);

    for (const file of Object.keys(decompiled).filter((it) => !isSidecar(it))) {
      expect([file, after[file]]).toEqual([file, decompiled[file]]);
    }
  });

  it("should write the scene's files", () => {
    const sizes = box
      .manifest()
      .filter((file) => file.path.startsWith("scene/"))
      .map((file) => (isSidecar(file.path) ? { path: file.path } : { path: file.path, size: file.size }));

    expect(sizes).toMatchSnapshot();
  });
});
