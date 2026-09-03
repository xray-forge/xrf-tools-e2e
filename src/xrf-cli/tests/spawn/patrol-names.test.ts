import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha } from "#/xrf-cli/test/sandbox";

const ALL_SPAWN = gamedata("spawns/all.spawn");

const PADDED_SECTION = "[e2e_padded_point_walk.0.wp00 ]";

// Windows-1251 `0xFD` is the Cyrillic letter this patrol point's name carries. Reading the file
// bytewise keeps it a single byte, which is the whole point: written as UTF-8 it would be two.
const W1251_NAME = Buffer.from("name01ý|ret=0", "latin1");

/**
 * Names that survive only in the section they were exported under.
 *
 * @remarks
 * Ltx trims values, so a trailing space in a patrol point name is lost from `points` and from the
 * `name` key, and lives only in the section name. Anomaly ships five such points, none exists in
 * Call of Pripyat, and a Call of Pripyat round trip was byte identical throughout — which is exactly
 * why the defect went unnoticed until a fork spawn could be read at all.
 */
describe("spawn patrol names", () => {
  const box = new Sandbox(__filename);

  let points: Buffer;

  beforeAll(() => {
    box.run("spawn unpack", ["--path", ALL_SPAWN, "--dest", box.at("unpacked")]);
    box.run("spawn pack", ["--path", box.at("unpacked"), "--dest", box.at("repacked.spawn")]);

    points = fs.readFileSync(box.at("unpacked/patrol_points.ltx"));
  });

  it("should export the padding in the section name", () => {
    expect(points.includes(PADDED_SECTION)).toBe(true);
  });

  it("should export a Windows-1251 name as one byte per character", () => {
    expect(points.includes(W1251_NAME)).toBe(true);
  });

  // Both names are one byte away from being wrong: the padding would be trimmed, and the Cyrillic
  // letter would double into UTF-8. Either shows up here and nowhere else.
  it("should reproduce the source byte for byte", () => {
    expect(box.sha("repacked.spawn")).toBe(sha(ALL_SPAWN));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
