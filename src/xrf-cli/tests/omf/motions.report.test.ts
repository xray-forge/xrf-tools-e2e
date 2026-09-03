import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("meshes/omf/wpn_svd_hud_animation.omf");

/**
 * What the omf motion editors report to a machine.
 */
describe("omf motion reports", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("omf duplicate-motion", [
      "--path",
      SOURCE,
      "--dest",
      box.at("duplicated.omf"),
      "--from",
      "idle",
      "--to",
      "idle_copy",
      "--silent",
      "--report",
      box.at("duplicate.json"),
    ]);
    box.run("omf filter-motions", [
      "--path",
      SOURCE,
      "--dest",
      box.at("kept-idle.omf"),
      "--keep",
      "idle",
      "--silent",
      "--report",
      box.at("filter.json"),
    ]);
    box.run("omf filter-motions", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-written.omf"),
      "--keep",
      "idle",
      "--dry-run",
      "--silent",
      "--report",
      box.at("filter-dry.json"),
    ]);

    const map: string = box.write(
      "rename-map.json",
      `${JSON.stringify({ idle: "stand", svd_shoot: "fire" }, undefined, 2)}\n`
    );

    box.run("omf rename-motions", [
      "--path",
      SOURCE,
      "--dest",
      box.at("renamed.omf"),
      "--map",
      map,
      "--silent",
      "--report",
      box.at("rename.json"),
    ]);
    box.run("omf repack", [
      "--path",
      SOURCE,
      "--dest",
      box.at("repacked.omf"),
      "--silent",
      "--report",
      box.at("repack.json"),
    ]);
  });

  it("should report a duplicated motion", () => {
    expect(box.json("duplicate.json")).toMatchSnapshot();
  });

  it("should report which motions a filter kept", () => {
    expect(box.json("filter.json")).toMatchSnapshot();
  });

  // A dry run reports the same shape and says it wrote nothing, which is what makes it usable as a
  // preview rather than something a caller has to infer from a missing file.
  it("should report a filter dry run as one that wrote nothing", () => {
    expect(box.json("filter-dry.json")).toMatchSnapshot();
  });

  it("should report renamed motions", () => {
    expect(box.json("rename.json")).toMatchSnapshot();
  });

  it("should report a repack", () => {
    expect(box.json("repack.json")).toMatchSnapshot();
  });
});
