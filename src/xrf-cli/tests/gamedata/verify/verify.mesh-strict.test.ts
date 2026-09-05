import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("gamedata verify strict mesh validation", () => {
  const box = new Sandbox(__filename);

  let strict: CliResult;

  beforeAll(() => {
    strict = box.run("gamedata verify", [gamedata(), "--checks", "meshes", "--strict"], { expectExit: 3 });
  });

  // This corpus already fails normal mesh validation; warning escalation has a separate texture fixture.
  it("should reach the same conclusion under strict", () => {
    expect(strict).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
