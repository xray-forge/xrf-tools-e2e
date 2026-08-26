import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox } from "#/test/sandbox";

/**
 * What `spawn info` reports to a machine.
 *
 * @remarks
 * Compared as the document itself rather than as a hash, so every field, name and nesting level of
 * the payload reaches the diff: a change to the reported shape is readable here rather than merely
 * detected. The envelope around it is pinned once in `cli/reporting`.
 */
describe("spawn info report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("spawn info", ["--path", gamedata("spawns/all.spawn"), "--silent", "--report", box.at("report.json")]);
  });

  it("should report the identity and census of a spawn file", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });
});
