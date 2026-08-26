import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox } from "#/test/sandbox";

const SOURCE = gamedata("textures/act_cat_bump.thm");

/**
 * What `thm patch-bump` reports to a machine.
 */
describe("thm patch-bump report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("thm patch-bump", [
      "--path",
      SOURCE,
      "--dest",
      box.at("assigned.thm"),
      "--to",
      "wpn\\wpn_pm\\wpn_pm_bump",
      "--silent",
      "--report",
      box.at("assigned.json"),
    ]);
    box.run("thm patch-bump", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-written.thm"),
      "--to",
      "wpn\\wpn_pm\\wpn_pm_bump",
      "--dry-run",
      "--silent",
      "--report",
      box.at("dry.json"),
    ]);
    box.run("thm patch-bump", [
      "--path",
      SOURCE,
      "--dest",
      box.at("cleared.thm"),
      "--off",
      "--silent",
      "--report",
      box.at("cleared.json"),
    ]);
  });

  it("should report the bump it replaced", () => {
    expect(box.json("assigned.json")).toMatchSnapshot();
  });

  it("should report a dry run as one that wrote nothing", () => {
    expect(box.json("dry.json")).toMatchSnapshot();
  });

  it("should report clearing a bump", () => {
    expect(box.json("cleared.json")).toMatchSnapshot();
  });
});
