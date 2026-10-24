import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("particles.xr");

describe("particle repack and particle re-unpack force", () => {
  const box = new Sandbox(__filename);

  let repackRefused: CliResult;
  let repackForced: CliResult;
  let reUnpackRefused: CliResult;
  let reUnpackForced: CliResult;

  let repackedBeforeRefusal: string;
  let repackedAfterRefusal: string;
  let reUnpackedBeforeStaleFile: Array<ManifestFile>;
  let reUnpackedAfterRefusal: Array<ManifestFile>;
  let reUnpackedAfterForce: Array<ManifestFile>;

  const reUnpacked = (): Array<ManifestFile> => box.manifest().filter((file) => file.path.startsWith("re-unpacked/"));

  beforeAll(() => {
    box.run("particle repack", ["--path", SOURCE, "--dest", box.at("repacked.xr")]);
    repackedBeforeRefusal = box.sha("repacked.xr");
    repackRefused = box.run("particle repack", ["--path", SOURCE, "--dest", box.at("repacked.xr")], { expectExit: 1 });
    repackedAfterRefusal = box.sha("repacked.xr");
    repackForced = box.run("particle repack", ["--path", SOURCE, "--dest", box.at("repacked.xr"), "--force"]);

    box.run("particle unpack", ["--path", SOURCE, "--dest", box.at("unpacked")]);
    box.run("particle re-unpack", ["--path", box.at("unpacked"), "--dest", box.at("re-unpacked")]);
    reUnpackedBeforeStaleFile = reUnpacked();

    box.write("re-unpacked/stale/sentinel.ltx", "stale destination bytes\n");
    reUnpackRefused = box.run("particle re-unpack", ["--path", box.at("unpacked"), "--dest", box.at("re-unpacked")], {
      expectExit: 1,
    });
    reUnpackedAfterRefusal = reUnpacked();
    reUnpackForced = box.run("particle re-unpack", [
      "--path",
      box.at("unpacked"),
      "--dest",
      box.at("re-unpacked"),
      "--force",
    ]);
    reUnpackedAfterForce = reUnpacked();
  });

  it("should refuse an existing repack destination and leave it untouched", () => {
    expect(repackRefused.stderr.join("\n")).toContain("--force");
    expect(repackedAfterRefusal).toBe(repackedBeforeRefusal);
  });

  it("should replace a repack destination when forced", () => {
    expect(repackForced.exitCode).toBe(0);
    expect(box.sha("repacked.xr")).toBe(repackedBeforeRefusal);
  });

  it("should refuse an existing re-unpack destination and leave it untouched", () => {
    expect(reUnpackRefused.stderr.join("\n")).toContain("--force");
    expect(reUnpackedAfterRefusal.some((file) => file.path === "re-unpacked/stale/sentinel.ltx")).toBe(true);
  });

  it("should prune stale files from a re-unpack destination when forced", () => {
    expect(reUnpackForced.exitCode).toBe(0);
    expect(reUnpackedAfterForce).toEqual(reUnpackedBeforeStaleFile);
  });
});
