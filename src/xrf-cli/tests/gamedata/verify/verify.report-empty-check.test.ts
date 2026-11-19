import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

describe("gamedata verify empty check report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    // The corpus has no scripts; this pins an empty check's document, not script validation.
    box.run("gamedata verify", [gamedata(), "--checks", "scripts", "--silent", "--report", box.at("scripts.json")]);
  });

  it("should report one check as a readable document", () => {
    expect(box.json("scripts.json")).toMatchSnapshot();
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["scripts.json"] })).toMatchSnapshot();
  });
});
