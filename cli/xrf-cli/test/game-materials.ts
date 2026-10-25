import * as fs from "node:fs";
import * as path from "node:path";

/** `SGameMtl::flDynamic`: what moving objects and bones are made of. */
export const DYNAMIC_MATERIAL_FLAG: number = 1 << 8;

/** `GAMEMTL_NONE_ID`, and the own-property mask of a pair inheriting from nothing. */
const NONE: number = 0xffffffff;

/**
 * One material of a written library.
 */
export interface IGameMaterial {
  id: number;
  name: string;
  flags?: number;
  /** Whether the material carries the density chunk Clear Sky added; defaults to true. */
  hasDensity?: boolean;
  /** Whether the material carries the multiplayer factor Call of Pripyat added; defaults to true. */
  hasMultiplayerFactor?: boolean;
}

/**
 * One pair of a written library, its lists as the comma-separated strings the library stores.
 */
export interface IGameMaterialPair {
  id: number;
  materials: [number, number];
  breakingSounds?: string;
  stepSounds?: string;
  collideSounds?: string;
  collideParticles?: string;
  collideMarks?: string;
}

/**
 * The materials the engine looks up by names of its own, `default_object` dynamic as it asserts, numbered 0 to 4.
 */
export const ENGINE_MATERIALS: Array<IGameMaterial> = [
  { id: 0, name: "default" },
  { id: 1, name: "default_object", flags: DYNAMIC_MATERIAL_FLAG },
  { id: 2, name: "objects\\small_box" },
  { id: 3, name: "objects\\bullet" },
  { id: 4, name: "objects\\knife" },
];

/**
 * Writes a game material library, `gamemtl.xr`, holding the given materials and pairs.
 *
 * The wire form is the editor's: a version chunk, the next material and pair numbers, then a chunk of numbered
 * materials and one of numbered pairs, each material's chunks in `SGameMtl::Save` order and each pair inheriting from
 * nothing. Names and lists are ASCII here, a valid subset of the Windows-1251 strings the format stores.
 *
 * @param destination - Destination library path.
 * @param materials - Materials, in library order.
 * @param pairs - Pairs, in library order.
 */
export function writeGameMaterials(
  destination: string,
  materials: Array<IGameMaterial>,
  pairs: Array<IGameMaterialPair> = []
): void {
  const counters: Buffer = Buffer.alloc(8);

  counters.writeUInt32LE(Math.max(-1, ...materials.map((material) => material.id)) + 1, 0);
  counters.writeUInt32LE(Math.max(-1, ...pairs.map((pair) => pair.id)) + 1, 4);

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(
    destination,
    Buffer.concat([
      chunk(0x1000, u16(1)),
      chunk(0x1001, counters),
      chunk(0x1002, Buffer.concat(materials.map((material, index) => chunk(index, materialChunks(material))))),
      chunk(0x1003, Buffer.concat(pairs.map((pair, index) => chunk(index, pairChunks(pair))))),
    ])
  );
}

function materialChunks(material: IGameMaterial): Buffer {
  return Buffer.concat([
    chunk(0x1000, Buffer.concat([u32(material.id), string(material.name)])),
    chunk(0x1005, string("")),
    chunk(0x1001, u32(material.flags ?? 0)),
    chunk(0x1002, floats([1, 1, 1, 0, 0.1])),
    chunk(0x1003, floats([0, 1, 0, 0])),
    material.hasMultiplayerFactor === false ? Buffer.alloc(0) : chunk(0x1008, floats([0])),
    chunk(0x1004, floats([1])),
    chunk(0x1006, floats([0])),
    material.hasDensity === false ? Buffer.alloc(0) : chunk(0x1007, floats([0])),
  ]);
}

function pairChunks(pair: IGameMaterialPair): Buffer {
  return Buffer.concat([
    chunk(0x1000, Buffer.concat([u32(pair.materials[0]), u32(pair.materials[1]), u32(pair.id), u32(NONE), u32(NONE)])),
    chunk(0x1002, string(pair.breakingSounds ?? "")),
    chunk(0x1003, string(pair.stepSounds ?? "")),
    chunk(
      0x1005,
      Buffer.concat([
        string(pair.collideSounds ?? ""),
        string(pair.collideParticles ?? ""),
        string(pair.collideMarks ?? ""),
      ])
    ),
  ]);
}

function chunk(id: number, payload: Buffer): Buffer {
  const header: Buffer = Buffer.alloc(8);

  header.writeUInt32LE(id, 0);
  header.writeUInt32LE(payload.length, 4);

  return Buffer.concat([header, payload]);
}

function u16(value: number): Buffer {
  const buffer: Buffer = Buffer.alloc(2);

  buffer.writeUInt16LE(value);

  return buffer;
}

function u32(value: number): Buffer {
  const buffer: Buffer = Buffer.alloc(4);

  buffer.writeUInt32LE(value);

  return buffer;
}

function floats(values: Array<number>): Buffer {
  const buffer: Buffer = Buffer.alloc(values.length * 4);

  values.forEach((value, index) => buffer.writeFloatLE(value, index * 4));

  return buffer;
}

function string(value: string): Buffer {
  return Buffer.concat([Buffer.from(value, "ascii"), Buffer.from([0])]);
}
