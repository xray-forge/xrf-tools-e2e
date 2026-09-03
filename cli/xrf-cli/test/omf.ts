/**
 * Byte surgery over motion containers, so a test can stage a bank the corpus does not carry.
 *
 * @remarks
 * Third-party banks exist whose payload labels are not text and whose motion ids are not ordinals, and no committed
 * fixture reproduces them. Rather than adding one, a clean bank is edited in place: every rewrite here keeps its
 * field's byte length, so no chunk size changes and the result is a valid container that differs only in the two
 * fields the engine never reads.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { Optional } from "#/types";

/** Container chunk holding motion payloads, one nested chunk per motion after the count. */
const MOTIONS_CHUNK_ID = 14;

/** Container chunk holding the motion definitions, which are what names a motion. */
const PARAMETERS_CHUNK_ID = 15;

/** Compression marker the engine folds into a chunk id, cleared before comparing ids. */
const CHUNK_ID_MASK = 0x7fffffff;

/** Bytes a motion definition spends on speed, power, accrue and falloff. */
const DEFINITION_FLOATS_LENGTH = 16;

interface Chunk {
  id: number;
  start: number;
  end: number;
}

/**
 * Lists the chunks of one container, in the order they are stored.
 *
 * @param buffer - Container bytes.
 * @param start - Offset the container begins at.
 * @param end - Offset the container ends at.
 * @returns Every chunk found, with the bounds of its payload.
 */
function readChunks(buffer: Buffer, start: number, end: number): Array<Chunk> {
  const chunks: Array<Chunk> = [];

  let offset: number = start;

  while (offset + 8 <= end) {
    const id: number = buffer.readUInt32LE(offset) & CHUNK_ID_MASK;
    const size: number = buffer.readUInt32LE(offset + 4);

    offset += 8;

    if (size > end - offset) {
      throw new Error(`Chunk ${id} declares ${size} bytes, beyond the ${end - offset} that remain`);
    }

    chunks.push({ id, start: offset, end: offset + size });

    offset += size;
  }

  return chunks;
}

/**
 * Finds one chunk by id.
 *
 * @param chunks - Chunks to search.
 * @param id - Chunk id to find.
 * @returns The matching chunk.
 */
function requireChunk(chunks: Array<Chunk>, id: number): Chunk {
  const chunk: Optional<Chunk> = chunks.find((it) => it.id === id);

  if (!chunk) {
    throw new Error(`Expected chunk ${id} in the motion container`);
  }

  return chunk;
}

/**
 * Offset just past the terminator of a NUL-terminated string.
 *
 * @param buffer - Bytes to read.
 * @param offset - Offset the string begins at.
 * @returns Offset of the first byte after the terminator.
 */
function skipStringZ(buffer: Buffer, offset: number): number {
  const terminator: number = buffer.indexOf(0, offset);

  if (terminator < 0) {
    throw new Error(`Unterminated string at offset ${offset}`);
  }

  return terminator + 1;
}

/**
 * Overwrites every payload label with bytes that are not text, keeping each label's length.
 *
 * @param buffer - Container bytes, edited in place.
 * @param motions - The motions chunk.
 */
function scrambleLabels(buffer: Buffer, motions: Chunk): void {
  for (const chunk of readChunks(buffer, motions.start, motions.end)) {
    // Chunk zero holds the motion count; the payloads are numbered from one.
    if (chunk.id === 0) {
      continue;
    }

    const terminator: number = buffer.indexOf(0, chunk.start);

    if (terminator < 0 || terminator > chunk.end) {
      throw new Error(`Motion payload ${chunk.id} carries no label terminator`);
    }

    for (let offset = chunk.start; offset < terminator; offset += 1) {
      // High bytes with no readable meaning, which is what the real banks store.
      buffer[offset] = 0x80 + ((offset * 7 + chunk.id) % 0x60);
    }
  }
}

/**
 * Overwrites every definition's motion id with a value that is not its ordinal.
 *
 * @param buffer - Container bytes, edited in place.
 * @param parameters - The parameters chunk.
 */
function scrambleMotionIds(buffer: Buffer, parameters: Chunk): void {
  let offset: number = parameters.start;

  const version: number = buffer.readUInt16LE(offset);

  offset += 2;

  const partsCount: number = buffer.readUInt16LE(offset);

  offset += 2;

  for (let part = 0; part < partsCount; part += 1) {
    offset = skipStringZ(buffer, offset);

    const bonesCount: number = buffer.readUInt16LE(offset);

    offset += 2;

    for (let bone = 0; bone < bonesCount; bone += 1) {
      offset = skipStringZ(buffer, offset) + 4;
    }
  }

  const motionsCount: number = buffer.readUInt16LE(offset);

  offset += 2;

  for (let motion = 0; motion < motionsCount; motion += 1) {
    // Name, flags and the bone or part index come before the id.
    offset = skipStringZ(buffer, offset) + 4 + 2;

    buffer.writeUInt16LE(50000 + motion * 13, offset);

    offset += 2 + DEFINITION_FLOATS_LENGTH;

    if (version >= 4) {
      const marksCount: number = buffer.readUInt32LE(offset);

      offset += 4;

      for (let mark = 0; mark < marksCount; mark += 1) {
        offset = skipStringZ(buffer, offset);

        const intervalsCount: number = buffer.readUInt32LE(offset);

        offset += 4 + intervalsCount * 8;
      }
    }
  }

  if (offset !== parameters.end) {
    throw new Error(`Read ${offset - parameters.start} of ${parameters.end - parameters.start} parameter bytes`);
  }
}

/**
 * Rewrites a motion container so its payload labels and motion ids stop meaning anything.
 *
 * @remarks
 * Reproduces the two fields a handful of third-party banks scramble, which release playback ignores: the label a
 * payload stores ahead of its keys, and the motion id a definition carries. Motion names, keyframes and every key
 * stay exactly as they were, so the result must still read, repack byte for byte, and report the same motions.
 *
 * @param source - Bytes of a well-formed omf file.
 * @returns A copy with both fields scrambled.
 */
export function scrambleMotionLabels(source: Buffer): Buffer {
  const buffer: Buffer = Buffer.from(source);
  const chunks: Array<Chunk> = readChunks(buffer, 0, buffer.length);

  scrambleLabels(buffer, requireChunk(chunks, MOTIONS_CHUNK_ID));
  scrambleMotionIds(buffer, requireChunk(chunks, PARAMETERS_CHUNK_ID));

  return buffer;
}

/**
 * Stages a scrambled copy of a committed bank at an absolute destination.
 *
 * @remarks
 * Takes plain paths rather than a sandbox, so the knowledge of what an omf is stays in this module and the sandbox
 * stays a working directory that knows no formats.
 *
 * @param from - Absolute path of a well-formed omf file.
 * @param to - Absolute destination path, usually a `Sandbox.at` result.
 * @returns The destination path.
 */
export function writeScrambledMotionLabels(from: string, to: string): string {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, scrambleMotionLabels(fs.readFileSync(from)));

  return to;
}
