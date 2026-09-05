import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("meshes/omf/wpn_svd_hud_animation.omf");

describe("omf rename-motions strict map", () => {
  const box = new Sandbox(__filename);

  let strict: CliResult;
  let sourceBefore: string;
  let destinationBefore: string;
  let destinationWasAbsent: boolean;

  beforeAll(() => {
    const map = box.write("rename-map.json", `${JSON.stringify({ idle: "stand", svd_shoot: "fire" }, undefined, 2)}\n`);
    const destination = box.at("never-strict.omf");

    sourceBefore = sha(SOURCE);
    strict = box.run(
      "omf rename-motions",
      ["--path", SOURCE, "--dest", destination, "--map", map, "--strict", "--report", box.at("strict.json")],
      { expectExit: 1 }
    );
    destinationWasAbsent = !fs.existsSync(destination);

    box.copyIn(SOURCE, "never-strict.omf");
    destinationBefore = box.sha("never-strict.omf");
    box.run(
      "omf rename-motions",
      ["--path", SOURCE, "--dest", destination, "--map", map, "--strict", "--report", box.at("strict.json")],
      { expectExit: 1 }
    );
  });

  it("should reject an incomplete map under strict", () => {
    expect(strict).toMatchSnapshot();
  });

  it("should report every input motion before refusing", () => {
    expect(box.json("strict.json")).toMatchSnapshot();
  });

  it("should report no renamed motions and the original motion names", () => {
    expect(box.json("strict.json")).toMatchObject({
      result: { motions: ["idle", "svd_shoot", "svd_reload"], renamed: 0 },
    });
  });

  it("should not create an absent destination on refusal", () => {
    expect(destinationWasAbsent).toBe(true);
  });

  it("should preserve both the complete input and an existing destination", () => {
    expect(sha(SOURCE)).toBe(sourceBefore);
    expect(box.sha("never-strict.omf")).toBe(destinationBefore);
  });

  it("should write only the map, report, and preserved destination", () => {
    expect(box.manifest({ normalized: ["strict.json"] })).toMatchSnapshot();
  });
});
