import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox } from "#/test/sandbox";

const SOURCE = gamedata("particles.xr");

/**
 * What the particle commands report to a machine.
 */
describe("particle reports", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("particle verify", ["--path", SOURCE, "--silent", "--report", box.at("verify.json")]);
    box.run("particle unpack", [
      "--path",
      SOURCE,
      "--dest",
      box.at("unpacked"),
      "--silent",
      "--report",
      box.at("unpack.json"),
    ]);
    box.run("particle pack", [
      "--path",
      box.at("unpacked"),
      "--dest",
      box.at("repacked.xr"),
      "--silent",
      "--report",
      box.at("pack.json"),
    ]);
    box.run("particle repack", [
      "--path",
      SOURCE,
      "--dest",
      box.at("again.xr"),
      "--silent",
      "--report",
      box.at("repack.json"),
    ]);
    box.run("particle re-unpack", [
      "--path",
      box.at("unpacked"),
      "--dest",
      box.at("unpacked-again"),
      "--silent",
      "--report",
      box.at("re-unpack.json"),
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

  it("should report what re-unpacking read and wrote", () => {
    expect(box.json("re-unpack.json")).toMatchSnapshot();
  });
});
