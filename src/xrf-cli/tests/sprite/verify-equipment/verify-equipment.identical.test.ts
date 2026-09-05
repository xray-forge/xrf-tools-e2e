import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SYSTEM_LTX = gamedata("configs/system.ltx");

describe("sprite verify-equipment identical icon sharing", () => {
  const box = new Sandbox(__filename);

  let verified: CliResult;

  beforeAll(() => {
    verified = box.run("sprite verify-equipment", ["--system-ltx", SYSTEM_LTX, "--report", box.at("verify.json")]);
  });

  // The committed sections include a pair sharing one slot exactly. Identical rects are legitimate
  // - variants such as _nimble and the quest copies do it - so a clean answer here is the point
  // rather than an accident.
  it("should accept a grid whose only sharing is identical", () => {
    expect(verified).toMatchSnapshot();
  });

  it("should report the clean icon grid verdict as a readable document", () => {
    expect(box.json("verify.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["verify.json"] })).toMatchSnapshot();
  });
});
