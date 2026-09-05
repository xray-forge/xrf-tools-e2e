import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const ALL_SPAWN = gamedata("spawns/all.spawn");

/** Unpacking replaces a complete project only after the caller permits pruning its destination. */
describe("spawn unpack force", () => {
  const box = new Sandbox(__filename);

  let refused: CliResult;
  let forced: CliResult;
  let expectedProject: Array<ManifestFile>;
  let projectBeforeRefusal: Array<ManifestFile>;
  let projectAfterRefusal: Array<ManifestFile>;
  let sourceBefore: string;
  let sourceAfterRefusal: string;
  let sourceAfterForced: string;

  beforeAll(() => {
    sourceBefore = sha(ALL_SPAWN);
    box.run("spawn unpack", ["--path", ALL_SPAWN, "--dest", box.at("unpacked")]);
    expectedProject = box.manifest();
    box.write("unpacked/stale/nested/sentinel.txt", "stale input must not survive forced export");

    projectBeforeRefusal = box.manifest();
    refused = box.run("spawn unpack", ["--path", ALL_SPAWN, "--dest", box.at("unpacked")], { expectExit: 1 });
    projectAfterRefusal = box.manifest();
    sourceAfterRefusal = sha(ALL_SPAWN);

    forced = box.run("spawn unpack", ["--path", ALL_SPAWN, "--dest", box.at("unpacked"), "--force"]);
    sourceAfterForced = sha(ALL_SPAWN);
  });

  it("should refuse an existing unpack destination", () => {
    expect(refused).toMatchSnapshot();
    expect(refused.stderr.join("\n")).toContain("--force");
  });

  it("should preserve the complete destination immediately after refusal", () => {
    expect(projectAfterRefusal).toEqual(projectBeforeRefusal);
    expect(sourceAfterRefusal).toBe(sourceBefore);
  });

  it("should prune nested stale files and restore the canonical project when forced", () => {
    expect(fs.existsSync(box.at("unpacked/stale/nested/sentinel.txt"))).toBe(false);
    expect(box.manifest()).toEqual(expectedProject);
    expect(sourceAfterForced).toBe(sourceBefore);
    expect(forced).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
