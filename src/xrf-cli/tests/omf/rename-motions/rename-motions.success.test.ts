import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

// Three motions: idle, svd_shoot, svd_reload. The map below covers two of them on purpose.
const SOURCE = gamedata("meshes/omf/wpn_svd_hud_animation.omf");

describe("omf rename-motions success", () => {
  const box = new Sandbox(__filename);

  let renamed: CliResult;
  let info: CliResult;

  beforeAll(() => {
    const map = box.write("rename-map.json", `${JSON.stringify({ idle: "stand", svd_shoot: "fire" }, undefined, 2)}\n`);

    renamed = box.run("omf rename-motions", [
      "--path",
      SOURCE,
      "--dest",
      box.at("renamed.omf"),
      "--map",
      map,
      "--report",
      box.at("rename.json"),
    ]);
    info = box.run("omf info", ["--path", box.at("renamed.omf")]);
  });

  it("should rename motions through a map", () => {
    expect(renamed).toMatchSnapshot();
  });

  it("should report renamed motions", () => {
    expect(box.json("rename.json")).toMatchSnapshot();
  });

  it("should read back the renamed motions", () => {
    expect(info).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["rename.json"] })).toMatchSnapshot();
  });
});
