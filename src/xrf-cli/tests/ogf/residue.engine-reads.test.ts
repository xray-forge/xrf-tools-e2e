import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * One chunk: id, the size its header declares, then the payload.
 *
 * @param id
 * @param payload
 * @param declared
 */
function chunk(id: number, payload: Buffer, declared: number = payload.length): Buffer {
  const header: Buffer = Buffer.alloc(8);

  header.writeUInt32LE(id >>> 0, 0);
  header.writeUInt32LE(declared, 4);

  return Buffer.concat([header, payload]);
}

/** `ogf_header` of a version 4 animated skeleton over a unit box. */
function header(): Buffer {
  const bytes: Buffer = Buffer.alloc(44);

  bytes.writeUInt8(4, 0);
  bytes.writeUInt8(3, 1);

  for (const offset of [16, 20, 24, 40]) {
    bytes.writeFloatLE(1, offset);
  }

  return bytes;
}

/**
 * A null-terminated Windows-1251 string; every test string is ASCII.
 *
 * @param value
 */
function stringZ(value: string): Buffer {
  return Buffer.concat([Buffer.from(value, "latin1"), Buffer.from([0])]);
}

/**
 * `OGF_S_MOTION_REFS2`: a count, then that many paths.
 *
 * @param refs
 */
function motionRefs(refs: Array<string>): Buffer {
  const count: Buffer = Buffer.alloc(4);

  count.writeUInt32LE(refs.length, 0);

  return Buffer.concat([count, ...refs.map(stringZ)]);
}

/**
 * `ogf_desc` with times `width` bytes wide, as the exporter's `time_t` was.
 *
 * @param width
 */
function description(width: 4 | 8): Buffer {
  const parts: Array<Buffer> = [stringZ("x:\\rawdata\\objects\\wide.object")];

  for (const name of ["convertor", "creator", "editor"]) {
    parts.push(stringZ(name), Buffer.alloc(width));
  }

  return Buffer.concat(parts);
}

const COUNTED_REF: string = "gwr\\food\\conserva\\conserva_hud_animation";
const LEGACY_REF: string = "anomaly_weapons\\hud_animation\\wpn_axe_hud_animation";

const SHAPES = ["understated", "overstated", "marked"] as const;

type Shape = (typeof SHAPES)[number];

/** The source read, its fix, and the fixed visual read back. */
interface IRun {
  info: CliResult;
  fix: CliResult;
  fixed: CliResult;
}

/**
 * Visual shapes a strict chunk walk refuses but the engine loads, read and normalized as the engine reads them.
 *
 * @remarks
 * `CKinematicsAnimated::Load` finds the motion refs chunk and reads its strings off the visual's own reader, so a
 * counted reference runs on past a size that understates it, and a last chunk declaring more than the file holds is
 * read from what is there. `find_chunk` masks the compression mark off a chunk's id, so a marked header reads as stored.
 * Each is reported as residue, and `ogf fix` corrects the size or the mark while keeping every byte the engine reads.
 */
describe("ogf residue the engine reads through", () => {
  const box = new Sandbox(__filename);

  const results = {} as Record<Shape, IRun>;

  beforeAll(() => {
    const refs: Buffer = motionRefs([COUNTED_REF]);
    const legacy: Buffer = stringZ(LEGACY_REF);
    const shapes: Record<Shape, Buffer> = {
      understated: Buffer.concat([
        chunk(1, header()),
        chunk(24, refs.subarray(0, refs.length - 14)),
        refs.subarray(refs.length - 14),
      ]),
      overstated: Buffer.concat([chunk(1, header()), chunk(19, legacy, legacy.length + 4)]),
      marked: Buffer.concat([chunk(0x80000001, header()), chunk(24, refs), chunk(18, description(8))]),
    };

    for (const name of SHAPES) {
      fs.writeFileSync(box.at(`${name}.ogf`), shapes[name]);

      results[name] = {
        info: box.run("ogf info", ["--path", box.at(`${name}.ogf`), "--report", box.at(`${name}.json`)]),
        fix: box.run("ogf fix", ["--path", box.at(`${name}.ogf`), "--dest", box.at(`${name}-fixed.ogf`)]),
        fixed: box.run("ogf info", ["--path", box.at(`${name}-fixed.ogf`), "--report", box.at(`${name}-fixed.json`)]),
      };
    }
  });

  it("should read a counted reference running past its chunk whole", () => {
    expect(results.understated.info.exitCode).toBe(0);
    expect(box.json("understated.json")).toMatchObject({
      result: { motionRefs: [COUNTED_REF], residue: { cause: "understated-motion-refs", size: 0 } },
    });
  });

  it("should read a legacy reference chunk that overstates its size", () => {
    expect(results.overstated.info.exitCode).toBe(0);
    expect(box.json("overstated.json")).toMatchObject({
      result: { motionRefs: [LEGACY_REF], residue: { cause: "overstated-motion-refs", size: 0 } },
    });
  });

  it("should read a marked header and a description with 64-bit times", () => {
    expect(results.marked.info.exitCode).toBe(0);
    expect(box.json("marked.json")).toMatchObject({
      result: {
        version: 4,
        motionRefs: [COUNTED_REF],
        description: { sourceFile: "x:\\rawdata\\objects\\wide.object", editor: "editor" },
        residue: null,
      },
    });
  });

  it("should fix each shape into a well-formed visual reading the same references", () => {
    for (const name of SHAPES) {
      expect(results[name].fix.exitCode).toBe(0);
      expect(results[name].fixed.exitCode).toBe(0);
      expect(box.json(`${name}-fixed.json`)).toMatchObject({
        result: {
          motionRefs: (box.json(`${name}.json`) as { result: { motionRefs: Array<string> } }).result.motionRefs,
          residue: null,
        },
      });
    }
  });

  it("should fix by correcting sizes and marks, dropping no byte", () => {
    for (const name of SHAPES) {
      expect(fs.statSync(box.at(`${name}-fixed.ogf`)).size).toBe(fs.statSync(box.at(`${name}.ogf`)).size);
    }
  });
});
