import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox } from "#/test/sandbox";

const ALL_SPAWN = gamedata("spawns/all.spawn");

/**
 * Group an unpacked ltx document by section, keyed by the `section = ` value its body carries.
 *
 * @remarks
 * ALife sections are numbered by file position, so a lookup by index would move whenever the fixture
 * gains an object. The game section name is what these assertions are actually about.
 *
 * @param lines - Normalized lines of `alife_spawns.ltx`.
 * @returns Body lines of each object, keyed by its game section.
 */
function objectsBySection(lines: Array<string>): Map<string, Array<string>> {
  const found = new Map<string, Array<string>>();
  let body: Array<string> = [];

  const flush = (): void => {
    const section = body.find((line) => line.startsWith("section = "))?.slice("section = ".length);

    if (section && !found.has(section)) {
      found.set(section, body);
    }
  };

  for (const line of lines) {
    if (line.startsWith("[")) {
      flush();
      body = [];
    } else {
      body.push(line);
    }
  }

  flush();

  return found;
}

/**
 * Read one object's payload keys, dropping the shared header and the base fields every object has.
 *
 * @param objects - Objects keyed by game section.
 * @param section - Game section to read.
 * @param prefixes - Payload key prefixes to keep.
 * @returns Matching lines, in file order.
 */
function payload(objects: Map<string, Array<string>>, section: string, prefixes: Array<string>): Array<string> {
  const body = objects.get(section);

  if (!body) {
    throw new Error(`Fixture has no '${section}' object`);
  }

  return body.filter((line) => prefixes.some((prefix) => line.startsWith(prefix)));
}

// Shapes that exist only in Call of Chernobyl and Anomaly. The fixture carries one of each, added by
// `cli/make-spawn-fixture.mjs`, because a fork spawn is a 96 MB installation file.
describe("spawn fork payloads", () => {
  const box = new Sandbox(__filename);

  let objects: Map<string, Array<string>>;

  beforeAll(() => {
    box.run("spawn unpack", ["--path", ALL_SPAWN, "--dest", box.at("unpacked")]);

    objects = objectsBySection(box.text("unpacked/alife_spawns.ltx"));
  });

  // Reached the catch-all "Not implemented parser for CseAlifeCar" before a reader existed.
  it("should read a car as visual, skeleton and health", () => {
    expect(payload(objects, "m_car", ["dynamic_visual.", "skeleton.", "car."])).toMatchSnapshot();
  });

  // The engine divides health above one by a hundred on read and writes the divided value back. The
  // fixture's car is stored at 1, so this pins the stored value rather than the normalized one.
  it("should keep the car health the file stores", () => {
    expect(payload(objects, "m_car", ["car.health"])).toEqual(["car.health = 1"]);
  });

  it("should read a trader as visual and trader abstract", () => {
    expect(payload(objects, "m_trader", ["dynamic_visual.", "trader."])).toMatchSnapshot();
  });

  // The two states that distinguish a zone whose script class appended a tail from one where it did
  // not. Nothing outside the file can tell them apart, so the reader takes it from the byte budget.
  it("should read a zone whose script tail is absent", () => {
    expect(payload(objects, "zone_mine_field_soc", ["anomalous_zone.last_spawn_time"])).toEqual([
      "anomalous_zone.last_spawn_time = absent",
    ]);
  });

  it("should read a zone whose script tail is present and empty", () => {
    expect(payload(objects, "zone_mosquito_bald", ["anomalous_zone.last_spawn_time"])).toEqual([
      "anomalous_zone.last_spawn_time = nil",
    ]);
  });

  it("should read a torrid zone whose script tail is absent", () => {
    expect(payload(objects, "generator_torrid", ["last_spawn_time"])).toEqual(["last_spawn_time = absent"]);
  });

  it("should read a visual zone whose script tail is present", () => {
    expect(payload(objects, "zone_burning_fuzz1", ["zone_visual."])).toMatchSnapshot();
  });

  it("should resolve every fork section to a class", () => {
    expect(
      [
        "m_car",
        "m_trader",
        "zone_mine_field_soc",
        "zone_mosquito_bald",
        "generator_torrid",
        "zone_burning_fuzz1",
      ].filter((section) => !objects.has(section))
    ).toEqual([]);
  });
});
