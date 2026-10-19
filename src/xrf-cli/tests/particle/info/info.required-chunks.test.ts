import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * One chunk: little-endian id and size, then the payload.
 *
 * @param id - Chunk id.
 * @param payload - Chunk body.
 * @returns The framed chunk.
 */
function chunk(id: number, payload: Buffer): Buffer {
  const header: Buffer = Buffer.alloc(8);

  header.writeUInt32LE(id, 0);
  header.writeUInt32LE(payload.length, 4);

  return Buffer.concat([header, payload]);
}

/**
 * A correctly framed library whose one effect carries no chunks. A release build aborts on a panic, so a reader that
 * panicked here would end the process instead of exiting 1 with a message naming what is missing.
 */
describe("particle info required chunks", () => {
  const box = new Sandbox(__filename);

  let result: CliResult;

  beforeAll(() => {
    const library: string = box.at("empty-effect.xr");

    fs.writeFileSync(
      library,
      Buffer.concat([chunk(1, Buffer.from([1, 0])), chunk(3, chunk(0, Buffer.alloc(0))), chunk(4, Buffer.alloc(0))])
    );

    result = box.run("particle info", ["--path", library], { expectExit: 1 });
  });

  it("should refuse the library with a parse error naming the missing chunk", () => {
    expect(result).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
