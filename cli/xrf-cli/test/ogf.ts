/**
 * Byte surgery over visuals, so a test can stage residue the corpus does not carry.
 */

import * as fs from "node:fs";

/** `OGF_S_USERDATA`, a root chunk `CKinematics::Load` opens and reads to its declared size. */
const USER_DATA_CHUNK_ID = 17;

/** A size past any staged file's end, so the chunk is cut short wherever it is appended. */
const DECLARED_USER_DATA_SIZE = 4343;

/** The start of the free-form ini text a user data chunk holds. */
const USER_DATA_TEXT = "[collide]";

/**
 * Appends a user data chunk declaring more bytes than the file holds.
 *
 * @remarks
 * The engine opens that chunk and would read past the file's end, so no reading of the engine's accounts for the
 * bytes: unlike text appended after the last chunk, which `find_chunk` takes for an id no loader asks for and never
 * reads, this residue must keep the visual refused. Append it to a well-formed visual, whose last chunk ends where the
 * file does.
 *
 * @param file - Absolute path of a well-formed ogf file, edited in place, usually a `Sandbox.copyIn` result.
 * @returns The same path.
 */
export function appendCutShortUserData(file: string): string {
  const header: Buffer = Buffer.alloc(8);

  header.writeUInt32LE(USER_DATA_CHUNK_ID, 0);
  header.writeUInt32LE(DECLARED_USER_DATA_SIZE, 4);
  fs.appendFileSync(file, Buffer.concat([header, Buffer.from(USER_DATA_TEXT, "latin1")]));

  return file;
}
