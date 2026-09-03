import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

/**
 * What `particle info` reports to a machine.
 */
describe("particle info report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("particle info", ["--path", gamedata("particles.xr"), "--silent", "--report", box.at("report.json")]);
  });

  it("should report the effect and group counts of a library", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });
});
