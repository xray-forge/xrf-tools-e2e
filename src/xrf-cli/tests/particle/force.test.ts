import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("particles.xr");

/**
 * The same refuse-then-prune guard the spawn commands have: a directory on the unpack side and a
 * file on the pack side.
 */
describe("particles force", () => {
  const box = new Sandbox(__filename);

  let unpackRefused: CliResult;
  let unpackForced: CliResult;
  let packRefused: CliResult;
  let packForced: CliResult;

  beforeAll(() => {
    box.run("particle unpack", ["--path", SOURCE, "--dest", box.at("unpacked")]);
    unpackRefused = box.run("particle unpack", ["--path", SOURCE, "--dest", box.at("unpacked")], { expectExit: 1 });
    unpackForced = box.run("particle unpack", ["--path", SOURCE, "--dest", box.at("unpacked"), "--force"]);

    box.run("particle pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.xr")]);
    packRefused = box.run("particle pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.xr")], {
      expectExit: 1,
    });
    packForced = box.run("particle pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.xr"), "--force"]);
  });

  it("should refuse an existing unpack destination", () => {
    expect(unpackRefused).toMatchSnapshot();
  });

  it("should prune it when forced", () => {
    expect(unpackForced).toMatchSnapshot();
  });

  it("should refuse an existing packed container", () => {
    expect(packRefused).toMatchSnapshot();
  });

  it("should replace it when forced", () => {
    expect(packForced).toMatchSnapshot();
  });

  // The packer is deterministic, so forcing a second pass over the same input has to land on the
  // same bytes the first pass wrote.
  it("should write the same container when forced", () => {
    expect(box.run("particle info", ["--path", box.at("packed.xr")])).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
