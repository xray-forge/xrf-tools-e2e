import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("gamedata verify ignored unrelated subtree", () => {
  const box = new Sandbox(__filename);

  let result: CliResult;

  beforeAll(() => {
    // Meshes never reads configs, so its usual findings must be reported despite the ignored config tree.
    result = box.run("gamedata verify", [gamedata(), "--checks", "meshes", "--ignore", "configs"], { expectExit: 3 });
  });

  it("should run a check that never reads the ignored prefix", () => {
    expect(result).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
