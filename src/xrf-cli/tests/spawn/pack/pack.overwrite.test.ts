import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const ALL_SPAWN = gamedata("spawns/all.spawn");

/** Publishing a spawn must leave an existing file alone until the caller explicitly permits replacement. */
describe("spawn pack overwrite", () => {
  const box = new Sandbox(__filename);

  let refused: CliResult;
  let forced: CliResult;
  let publishedBefore: string;
  let publishedAfterRefusal: string;
  let inputBeforeRefusal: Array<ManifestFile>;
  let inputAfterRefusal: Array<ManifestFile>;
  let changedOutput: string;

  beforeAll(() => {
    box.run("spawn unpack", ["--path", ALL_SPAWN, "--dest", box.at("unpacked")]);
    box.run("spawn pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.spawn")]);

    publishedBefore = box.sha("packed.spawn");
    inputBeforeRefusal = box.manifest();
    refused = box.run("spawn pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.spawn")], {
      expectExit: 1,
    });
    publishedAfterRefusal = box.sha("packed.spawn");
    inputAfterRefusal = box.manifest();

    box.write("packed.spawn", "changed packed bytes");
    changedOutput = box.sha("packed.spawn");
    forced = box.run("spawn pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.spawn"), "--force"]);
  });

  it("should refuse an existing packed file", () => {
    expect(refused).toMatchSnapshot();
    expect(refused.stderr.join("\n")).toContain("--force");
  });

  it("should preserve every existing output byte immediately after refusal", () => {
    expect(publishedAfterRefusal).toBe(publishedBefore);
    expect(inputAfterRefusal).toEqual(inputBeforeRefusal);
  });

  it("should replace changed output with canonical spawn bytes when forced", () => {
    expect(box.sha("packed.spawn")).not.toBe(changedOutput);
    expect(box.sha("packed.spawn")).toBe(sha(ALL_SPAWN));
    expect(forced).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
