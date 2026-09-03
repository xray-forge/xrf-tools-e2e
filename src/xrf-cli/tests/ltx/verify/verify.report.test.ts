import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

/**
 * What `ltx verify` reports to a machine.
 */
describe("ltx verify report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("ltx verify", ["--path", gamedata("configs"), "--silent", "--report", box.at("report.json")]);
  });

  it("should report the coverage a verification reached", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });
});
