import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

const ALL_SPAWN = gamedata("spawns/all.spawn");

/**
 * What the spawn commands report to a machine.
 */
describe("spawn reports", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("spawn verify", ["--path", ALL_SPAWN, "--silent", "--report", box.at("verify.json")]);
    box.run("spawn unpack", [
      "--path",
      ALL_SPAWN,
      "--dest",
      box.at("unpacked"),
      "--silent",
      "--report",
      box.at("unpack.json"),
    ]);
    box.run("spawn pack", [
      "--path",
      box.at("unpacked"),
      "--dest",
      box.at("repacked.spawn"),
      "--silent",
      "--report",
      box.at("pack.json"),
    ]);
    box.run("spawn repack", [
      "--path",
      ALL_SPAWN,
      "--dest",
      box.at("again.spawn"),
      "--silent",
      "--report",
      box.at("repack.json"),
    ]);
  });

  it("should report a verdict on the source", () => {
    expect(box.json("verify.json")).toMatchSnapshot();
  });

  // The two durations are why a conversion reports any at all: the envelope times the whole run and
  // cannot say how much of it was reading versus writing.
  it("should report what unpacking read and wrote", () => {
    expect(box.json("unpack.json")).toMatchSnapshot();
  });

  it("should report what packing read and wrote", () => {
    expect(box.json("pack.json")).toMatchSnapshot();
  });

  it("should report what repacking read and wrote", () => {
    expect(box.json("repack.json")).toMatchSnapshot();
  });
});
