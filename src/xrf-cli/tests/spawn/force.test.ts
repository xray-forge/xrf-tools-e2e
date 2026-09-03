import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const ALL_SPAWN = gamedata("spawns/all.spawn");

/**
 * Both commands refuse to overwrite by default and need `--force` to prune what is already there.
 * It guards a directory on the unpack side and a file on the pack side, so each is worth its own
 * pass: an unpack that quietly merged into a stale directory, or a pack that silently replaced a
 * spawn, is the kind of loss that is noticed much later.
 */
describe("spawn force", () => {
  const box = new Sandbox(__filename);

  let unpackRefused: CliResult;
  let unpackForced: CliResult;
  let packRefused: CliResult;
  let packForced: CliResult;

  beforeAll(() => {
    box.run("spawn unpack", ["--path", ALL_SPAWN, "--dest", box.at("unpacked")]);
    unpackRefused = box.run("spawn unpack", ["--path", ALL_SPAWN, "--dest", box.at("unpacked")], { expectExit: 1 });
    unpackForced = box.run("spawn unpack", ["--path", ALL_SPAWN, "--dest", box.at("unpacked"), "--force"]);

    box.run("spawn pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.spawn")]);
    packRefused = box.run("spawn pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.spawn")], {
      expectExit: 1,
    });
    packForced = box.run("spawn pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.spawn"), "--force"]);
  });

  it("should refuse an existing unpack destination", () => {
    expect(unpackRefused).toMatchSnapshot();
  });

  it("should prune it when forced", () => {
    expect(unpackForced).toMatchSnapshot();
  });

  it("should refuse an existing packed file", () => {
    expect(packRefused).toMatchSnapshot();
  });

  it("should replace it when forced", () => {
    expect(packForced).toMatchSnapshot();
  });

  // Forcing replaces the file rather than appending to or truncating it, so the result still has
  // to be the spawn it started from.
  it("should still reproduce the source after a forced pass", () => {
    expect(box.sha("packed.spawn")).toBe(sha(ALL_SPAWN));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
