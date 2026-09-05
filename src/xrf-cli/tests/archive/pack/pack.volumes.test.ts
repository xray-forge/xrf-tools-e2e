import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

/** Smallest cap the corpus can be packed under, in megabytes. */
const MAXIMUM_VOLUME_MEGABYTES = 2;
const MAXIMUM_VOLUME_BYTES = MAXIMUM_VOLUME_MEGABYTES * 1024 * 1024;

describe("archive pack volumes", () => {
  const box = new Sandbox(__filename);

  let split: CliResult;
  let refused: CliResult;

  beforeAll(() => {
    split = box.run("archive pack", [
      "--path",
      gamedata(),
      "--dest",
      box.at("split"),
      "--name",
      "gamedata",
      "--max-size",
      String(MAXIMUM_VOLUME_MEGABYTES),
    ]);

    refused = box.run(
      "archive pack",
      ["--path", gamedata(), "--dest", box.at("refused"), "--name", "gamedata", "--max-size", "1"],
      { expectExit: 1 }
    );
  });

  it("should split a pack across volumes", () => {
    expect(split).toMatchSnapshot();
  });

  it("should keep every written volume inside the requested cap", () => {
    const volumes: Array<ManifestFile> = box.manifest().filter((file) => file.path.startsWith("split/"));

    expect(volumes.length).toBeGreaterThan(1);

    for (const volume of volumes) {
      expect(volume.size).toBeLessThanOrEqual(MAXIMUM_VOLUME_BYTES);
    }
  });

  it("should remove partial output when one file cannot fit the cap", () => {
    expect(refused).toMatchSnapshot();
    expect(refused.stderr.join("\n")).toContain("particles.xr");
    expect(box.manifest().some((file) => file.path.startsWith("refused/"))).toBe(false);
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
