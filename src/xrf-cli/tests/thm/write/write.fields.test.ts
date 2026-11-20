import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const TEXTURE = gamedata("textures/prop_lampa_g.dds");

describe("thm write fields", () => {
  const box = new Sandbox(__filename);

  let named: CliResult;
  let printed: CliResult;
  let unknownFormat: CliResult;
  let contradiction: CliResult;

  beforeAll(() => {
    named = box.run("thm write", [
      TEXTURE,
      "--dest",
      box.at("lamp.thm"),
      "--texture-type",
      "terrain",
      "--mip-filter",
      "kaiser",
      "--detail-name",
      "detail\\detail_grnd_earth",
      "--detail-scale",
      "4",
      "--set-flag",
      "flDiffuseDetail,flImplicitLighted",
      "--clear-flag",
      "flDitherColor",
      "--fade-color",
      "7F7F7F7F",
      "--fade-amount",
      "25",
      "--fade-delay",
      "1",
      "--report",
      box.at("named.json"),
    ]);
    printed = box.run("thm info", [box.at("lamp.thm")]);
    unknownFormat = box.run("thm write", [TEXTURE, "--dest", box.at("unwritten.thm"), "--format", "bc7"], {
      expectExit: 2,
    });
    contradiction = box.run(
      "thm write",
      [TEXTURE, "--dest", box.at("unwritten.thm"), "--set-flag", "flHasAlpha", "--clear-flag", "flHasAlpha"],
      { expectExit: 1 }
    );
  });

  it("should write the fields named over the defaults", () => {
    expect(named).toMatchSnapshot();
    expect(box.json("named.json")).toMatchSnapshot();
  });

  it("should read back with every field named", () => {
    expect(printed).toMatchSnapshot();
  });

  it("should refuse a value outside a field's choices as a usage error", () => {
    expect(unknownFormat).toMatchSnapshot();
  });

  it("should refuse a flag both set and cleared", () => {
    expect(contradiction).toMatchSnapshot();
  });

  it("should write only the named descriptor", () => {
    expect(box.manifest({ normalized: ["named.json"] })).toMatchSnapshot();
  });
});
