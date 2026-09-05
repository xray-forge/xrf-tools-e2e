import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("meshes/omf/wpn_svd_hud_animation.omf");

describe("omf rename-motions dry run", () => {
  const box = new Sandbox(__filename);

  let dryRun: CliResult;
  let sourceBefore: string;
  let destinationBefore: string;
  let destinationWasAbsent: boolean;

  beforeAll(() => {
    const map = box.write("rename-map.json", `${JSON.stringify({ idle: "stand", svd_shoot: "fire" }, undefined, 2)}\n`);
    const destination = box.at("never-renamed.omf");

    sourceBefore = sha(SOURCE);
    dryRun = box.run("omf rename-motions", [
      "--path",
      SOURCE,
      "--dest",
      destination,
      "--map",
      map,
      "--dry-run",
      "--report",
      box.at("dry-run.json"),
    ]);
    destinationWasAbsent = !fs.existsSync(destination);

    box.copyIn(SOURCE, "never-renamed.omf");
    destinationBefore = box.sha("never-renamed.omf");
    box.run("omf rename-motions", [
      "--path",
      SOURCE,
      "--dest",
      destination,
      "--map",
      map,
      "--dry-run",
      "--report",
      box.at("dry-run.json"),
    ]);
  });

  it("should report a dry run without writing", () => {
    expect(dryRun).toMatchSnapshot();
  });

  it("should report the renamed labels without writing them", () => {
    expect(box.json("dry-run.json")).toMatchSnapshot();
    expect(box.json("dry-run.json")).toMatchObject({
      result: { isDry: true, motions: ["stand", "fire", "svd_reload"], renamed: 2 },
    });
  });

  it("should not create an absent destination in a dry run", () => {
    expect(destinationWasAbsent).toBe(true);
  });

  it("should preserve both the complete input and an existing destination", () => {
    expect(sha(SOURCE)).toBe(sourceBefore);
    expect(box.sha("never-renamed.omf")).toBe(destinationBefore);
  });

  it("should write only the map, report, and preserved destination", () => {
    expect(box.manifest({ normalized: ["dry-run.json"] })).toMatchSnapshot();
  });
});
