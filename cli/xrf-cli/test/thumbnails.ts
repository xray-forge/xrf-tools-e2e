import * as fs from "node:fs";
import * as path from "node:path";

/** `THM_CHUNK_VERSION`, which every thumbnail opens with. */
const VERSION_CHUNK: number = 0x0810;

/** `THM_CHUNK_DATA`, the preview an object's or a group's thumbnail carries. */
const PREVIEW_CHUNK: number = 0x0811;

/** `THM_CHUNK_TYPE`, the subject the thumbnail describes. */
const TYPE_CHUNK: number = 0x0813;

/**
 * One chunk as the format lays it out: id, payload length, then the payload.
 *
 * @param id - Chunk id.
 * @param payload - Chunk payload.
 * @returns The chunk's bytes.
 */
function chunk(id: number, payload: Buffer): Buffer {
  const header: Buffer = Buffer.alloc(8);

  header.writeUInt32LE(id, 0);
  header.writeUInt32LE(payload.length, 4);

  return Buffer.concat([header, payload]);
}

function u16(value: number): Buffer {
  const bytes: Buffer = Buffer.alloc(2);

  bytes.writeUInt16LE(value);

  return bytes;
}

function u32(...values: Array<number>): Buffer {
  const bytes: Buffer = Buffer.alloc(4 * values.length);

  values.forEach((value, index) => bytes.writeUInt32LE(value, 4 * index));

  return bytes;
}

function f32(...values: Array<number>): Buffer {
  const bytes: Buffer = Buffer.alloc(4 * values.length);

  values.forEach((value, index) => bytes.writeFloatLE(value, 4 * index));

  return bytes;
}

/**
 * A preview stored uncompressed: readers keep its bytes as they are and decode them only on request, so a few stand
 * in for the 128 by 128 picture the SDK draws.
 */
const PREVIEW: Buffer = chunk(PREVIEW_CHUNK, Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));

/**
 * An object's thumbnail, `EObjectThumbnail`: version 0x12, the preview, the object type, then face and vertex count.
 */
export const OBJECT_THUMBNAIL: Buffer = Buffer.concat([
  chunk(VERSION_CHUNK, u16(0x0012)),
  PREVIEW,
  chunk(TYPE_CHUNK, u32(0)),
  chunk(0x0816, u32(1200, 640)),
]);

/**
 * A group's thumbnail, `EGroupThumbnail`: stamped with the object type like an object's, told apart by its version
 * 0x01 and its objects chunk, a count then zero-terminated library names.
 */
export const GROUP_THUMBNAIL: Buffer = Buffer.concat([
  chunk(VERSION_CHUNK, u16(0x0001)),
  PREVIEW,
  chunk(TYPE_CHUNK, u32(0)),
  chunk(0x0001, Buffer.concat([u32(2), Buffer.from("trees\\tree_pine_01\0rocks\\rock_02\0", "latin1")])),
]);

/**
 * A sound's thumbnail, `ESoundThumbnail`: version 0x14, the sound type, quality, distances and game type, then base
 * volume and AI distance.
 */
export const SOUND_THUMBNAIL: Buffer = Buffer.concat([
  chunk(VERSION_CHUNK, u16(0x0014)),
  chunk(TYPE_CHUNK, u32(2)),
  chunk(0x1000, Buffer.concat([f32(0.5, 2, 80), u32(0)])),
  chunk(0x1001, f32(1)),
  chunk(0x1002, f32(80)),
]);

/**
 * Writes a thumbnail's bytes to a path, creating the directories leading to it.
 *
 * @param destination - Absolute destination path.
 * @param bytes - The thumbnail.
 * @returns The destination path.
 */
export function writeThumbnail(destination: string, bytes: Buffer): string {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);

  return destination;
}
