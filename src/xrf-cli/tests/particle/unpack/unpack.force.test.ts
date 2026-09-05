import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("particles.xr");

describe("particle unpack force", () => {
  const box = new Sandbox(__filename);

  let first: CliResult;
  let refused: CliResult;
  let forced: CliResult;

  let sourceBeforeRefusal: string;
  let sourceAfterRefusal: string;
  let projectBeforeStaleFile: Array<ManifestFile>;
  let destinationBeforeRefusal: Array<ManifestFile>;
  let destinationAfterRefusal: Array<ManifestFile>;
  let destinationAfterForce: Array<ManifestFile>;

  beforeAll(() => {
    first = box.run("particle unpack", ["--path", SOURCE, "--dest", box.at("unpacked")]);
    projectBeforeStaleFile = box.manifest().filter((file) => file.path.startsWith("unpacked/"));

    box.write("unpacked/stale/nested/sentinel.ltx", "stale destination bytes\n");
    sourceBeforeRefusal = sha(SOURCE);
    destinationBeforeRefusal = box.manifest().filter((file) => file.path.startsWith("unpacked/"));
    refused = box.run("particle unpack", ["--path", SOURCE, "--dest", box.at("unpacked")], { expectExit: 1 });
    sourceAfterRefusal = sha(SOURCE);
    destinationAfterRefusal = box.manifest().filter((file) => file.path.startsWith("unpacked/"));

    forced = box.run("particle unpack", ["--path", SOURCE, "--dest", box.at("unpacked"), "--force"]);
    destinationAfterForce = box.manifest().filter((file) => file.path.startsWith("unpacked/"));
  });

  it("should unpack into an empty destination", () => {
    expect(first).toMatchSnapshot();
  });

  it("should refuse an existing unpack destination", () => {
    expect(refused).toMatchSnapshot();
    expect(refused.stderr.join("\n")).toContain("--force");
  });

  it("should preserve the source and complete destination when refused", () => {
    expect(sourceAfterRefusal).toBe(sourceBeforeRefusal);
    expect(destinationAfterRefusal).toEqual(destinationBeforeRefusal);
  });

  it("should prune nested stale files when forced", () => {
    expect(forced).toMatchSnapshot();
    expect(destinationAfterForce).toEqual(projectBeforeStaleFile);
    expect(destinationAfterForce.some((file) => file.path === "unpacked/stale/nested/sentinel.ltx")).toBe(false);
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
