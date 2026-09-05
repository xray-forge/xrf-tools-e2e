import * as fs from "node:fs";
import * as path from "node:path";

/** X-Ray THM chunk ids from `ThmTextureTypeChunk` and `ThmBumpChunk`. */
const TEXTURE_TYPE_CHUNK = 0x0814;
const BUMP_CHUNK = 0x0817;

/** `ThmTextureTypeChunk::IMAGE` and `ThmBumpChunk::MODE_USE`. */
const IMAGE_TEXTURE_TYPE = 0;
const USED_BUMP_MODE = 2;

export interface TextureDescriptorOptions {
  bump: string;
  mode?: number;
  textureType?: number;
}

/**
 * Writes a minimal parseable image THM with an explicit bump declaration.
 *
 * The wire form follows `ChunkWriter::flush_chunk_into`: little-endian chunk id and payload length, followed by the
 * payload. Its two payloads are `ThmTextureTypeChunk` and `ThmBumpChunk`; bump names are ASCII in these fixtures, a
 * valid subset of the null-terminated Windows-1251 string that the chunk writer emits.
 *
 * @param destination Destination THM path.
 * @param options Explicit bump declaration fields.
 */
export function writeTextureDescriptor(destination: string, options: TextureDescriptorOptions): void {
  const type: Buffer = Buffer.alloc(4);

  type.writeUInt32LE(options.textureType ?? IMAGE_TEXTURE_TYPE);

  const bumpName: Buffer = Buffer.from(options.bump, "ascii");
  const bump: Buffer = Buffer.alloc(8 + bumpName.length + 1);

  bump.writeFloatLE(0.05, 0);
  bump.writeUInt32LE(options.mode ?? USED_BUMP_MODE, 4);
  bumpName.copy(bump, 8);

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, Buffer.concat([chunk(TEXTURE_TYPE_CHUNK, type), chunk(BUMP_CHUNK, bump)]));
}

function chunk(id: number, payload: Buffer): Buffer {
  const header: Buffer = Buffer.alloc(8);

  header.writeUInt32LE(id, 0);
  header.writeUInt32LE(payload.length, 4);

  return Buffer.concat([header, payload]);
}
