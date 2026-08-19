import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sortedOutput, type CliResult } from "#/test/sandbox";

describe("verify-gamedata strict mode", () => {
  const box = new Sandbox(__filename);

  let strict: CliResult;

  beforeAll(() => {
    strict = box.run("verify-gamedata", [gamedata(), "--checks", "meshes", "--strict"], { expectExit: 1 });
  });

  // Recorded as current behaviour: strict is meant to validate expensive payloads fully, and on
  // this tree it reaches the same conclusion as the ordinary run does.
  it("should reach the same conclusion under strict", () => {
    expect(sortedOutput(strict)).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
