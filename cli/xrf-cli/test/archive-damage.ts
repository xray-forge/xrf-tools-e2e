import * as fs from "node:fs";
import * as path from "node:path";

const CHUNK_HEADER_SIZE = 8;
const CHUNK_ID_MASK = 0x7fffffff;

/**
 * Copies a volume after changing one byte in its first data chunk.
 *
 * The descriptor and metadata chunks remain intact, so a reader can open the volume before a
 * payload read reaches the damaged byte.
 *
 * @param source - Complete volume to copy.
 * @param destination - Path for the damaged copy.
 * @returns The destination path.
 */
export function corruptFirstArchivePayload(source: string, destination: string): string {
  const volume: Buffer = fs.readFileSync(source);
  let position = 0;

  while (position + CHUNK_HEADER_SIZE <= volume.length) {
    const chunkId: number = volume.readUInt32LE(position) & CHUNK_ID_MASK;
    const size: number = volume.readUInt32LE(position + 4);
    const payload = position + CHUNK_HEADER_SIZE;

    if (size > volume.length - payload) {
      throw new Error(`Archive '${source}' declares a chunk beyond its end.`);
    }

    if (chunkId === 0 && size > 0) {
      const original = volume[payload];

      if (original === undefined) {
        throw new Error(`Archive '${source}' data chunk has no first byte.`);
      }

      volume[payload] = original ^ 0xff;
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, volume);

      return destination;
    }

    position = payload + size;
  }

  throw new Error(`Archive '${source}' has no non-empty data chunk.`);
}

/**
 * Copies a volume with its final byte removed.
 *
 * Archive writers place their descriptor table after payload chunks, so this makes opening the
 * volume fail before verification can begin.
 *
 * @param source - Complete volume to copy.
 * @param destination - Path for the truncated copy.
 * @returns The destination path.
 */
export function truncateArchiveTail(source: string, destination: string): string {
  const volume: Buffer = fs.readFileSync(source);

  if (volume.length === 0) {
    throw new Error(`Archive '${source}' is already empty.`);
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, volume.subarray(0, -1));

  return destination;
}
