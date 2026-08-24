import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sortedFindings, type CliResult } from "#/test/sandbox";

describe("gamedata verify strict mode", () => {
  const box = new Sandbox(__filename);

  let strict: CliResult;

  beforeAll(() => {
    strict = box.run("gamedata verify", [gamedata(), "--checks", "meshes", "--strict"], { expectExit: 3 });
  });

  // Recorded as current behaviour: strict is meant to validate expensive payloads fully, and on
  // this tree it reaches the same conclusion as the ordinary run does.
  it("should reach the same conclusion under strict", () => {
    expect(sortedFindings(strict)).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
