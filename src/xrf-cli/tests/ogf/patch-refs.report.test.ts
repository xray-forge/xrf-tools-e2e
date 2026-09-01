import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox } from "#/test/sandbox";

const SOURCE = gamedata("meshes/ogf/dev_bolt_hud.ogf");

/**
 * What the ogf patchers report to a machine.
 */
describe("ogf patch reports", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("ogf patch-motion-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("repointed.ogf"),
      "--refs",
      "dynamics\\devices\\dev_bolt\\dev_bolt_replacement",
      "--silent",
      "--report",
      box.at("motion-refs.json"),
    ]);
    box.run("ogf patch-motion-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-written.ogf"),
      "--refs",
      "dynamics\\devices\\dev_bolt\\dev_bolt_replacement",
      "--dry-run",
      "--silent",
      "--report",
      box.at("motion-refs-dry.json"),
    ]);
    box.run("ogf patch-texture-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("renamed.ogf"),
      "--from",
      "wpn\\wpn_bolt",
      "--to",
      "wpn\\wpn_bolt_renamed",
      "--silent",
      "--report",
      box.at("texture-refs.json"),
    ]);
  });

  it("should report what a motion-refs patch rewrote", () => {
    expect(box.json("motion-refs.json")).toMatchSnapshot();
  });

  // A dry run reports the same shape and says it wrote nothing, which is what makes it usable as a
  // preview rather than something a caller has to infer from a missing file.
  it("should report a dry run as one that wrote nothing", () => {
    expect(box.json("motion-refs-dry.json")).toMatchSnapshot();
  });

  it("should report what a texture-refs patch rewrote", () => {
    expect(box.json("texture-refs.json")).toMatchSnapshot();
  });
});
