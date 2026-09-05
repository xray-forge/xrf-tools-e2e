import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Bytes a one megabyte volume cannot hold, as a stored payload that compression never touches.
 */
const OVERSIZED_PAYLOAD_BYTES = 1_536 * 1_024;

describe("archive pack verbose late failure", () => {
  const box = new Sandbox(__filename);

  let failing: CliResult;

  beforeAll(() => {
    const source: string = box.copyIn(gamedata("configs"), "source");

    // The name sorts after all fixture entries, so the failure lands after the first volume is opened and work is
    // visible in the verbose log. The unforced run must then take every partial volume back.
    fs.writeFileSync(box.at("source/zz_big.bin"), Buffer.alloc(OVERSIZED_PAYLOAD_BYTES, 0x5a));

    failing = box.run(
      "archive pack",
      ["--path", source, "--dest", box.at("failing"), "--name", "a", "--max-size", "1", "--verbose"],
      { expectExit: 1 }
    );
  });

  it("should leave a log naming the opened volume and the last entry before a failure", () => {
    expect(failing).toMatchSnapshot();
    expect(failing.stdout).toContain("Opened volume: a.db0");
    expect(failing.stderr.join("\n")).toMatch(/zz_big\.bin/);
  });

  it("should remove the partial volume set", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
