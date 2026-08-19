import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

// Three motions: idle, svd_shoot, svd_reload. The map below covers two of them on purpose.
const SOURCE = gamedata("meshes/omf/wpn_svd_hud_animation.omf");

describe("rename-omf-motions", () => {
  const box = new Sandbox(__filename);

  let renamed: CliResult;
  let dryRun: CliResult;
  let strict: CliResult;
  let info: CliResult;

  beforeAll(() => {
    const map = box.write("rename-map.json", `${JSON.stringify({ idle: "stand", svd_shoot: "fire" }, undefined, 2)}\n`);

    renamed = box.run("rename-omf-motions", ["--path", SOURCE, "--dest", box.at("renamed.omf"), "--map", map]);
    dryRun = box.run("rename-omf-motions", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-renamed.omf"),
      "--map",
      map,
      "--dry-run",
    ]);

    // Strict requires the map to cover every motion, and this one leaves svd_reload out.
    strict = box.run(
      "rename-omf-motions",
      ["--path", SOURCE, "--dest", box.at("never-strict.omf"), "--map", map, "--strict"],
      { expectExit: 1 }
    );

    info = box.run("info-omf", ["--path", box.at("renamed.omf")]);
  });

  it("should rename motions through a map", () => {
    expect(renamed).toMatchSnapshot();
  });

  it("should read back the renamed motions", () => {
    expect(info).toMatchSnapshot();
  });

  it("should report a dry run without writing", () => {
    expect(dryRun).toMatchSnapshot();
  });

  it("should reject an incomplete map under strict", () => {
    expect(strict).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
