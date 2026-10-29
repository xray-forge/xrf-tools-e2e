import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Reading what a level's surfaces are made of off its collision form.
 *
 * No fixture level carries a `level.cform`, and no command writes one, so the suite pins what a level without one
 * comes to; the tally itself is covered by `xrf-level`'s tests over a built form.
 */
describe("level materials report", () => {
  const box = new Sandbox(__filename);

  let missing: CliResult;
  let usage: CliResult;

  beforeAll(() => {
    box.copyIn(resource("levels/triangle"), "root/levels/triangle");

    missing = box.run(
      "level materials",
      ["--root", box.at("root"), "--level", "triangle", "--source", "directory", "--report", box.at("missing.json")],
      { expectExit: 1 }
    );
    usage = box.run("level materials", [], { expectExit: 2 });
  });

  it("should refuse a level without the collision form its materials are read from", () => {
    expect(envelopeAt(box.at("missing.json"))).toMatchObject({
      exitCode: 1,
      error: expect.stringContaining("levels\\triangle\\level.cform"),
    });
    expect(envelopeAt(box.at("missing.json"))).not.toHaveProperty("result");
    expect(missing).toMatchSnapshot();
  });

  it("should require a level", () => {
    expect(usage).toMatchSnapshot();
  });

  it("should write only the requested report", () => {
    expect(box.manifest({ normalized: ["missing.json"] })).toMatchSnapshot();
  });
});
