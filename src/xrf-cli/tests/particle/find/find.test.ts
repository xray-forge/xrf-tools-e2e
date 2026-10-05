import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const LIBRARY = gamedata("particles.xr");

/**
 * What `particle find` says about effects drawing a texture and groups playing an effect.
 *
 * @remarks
 * `pfx\pfx_splash_02` is sampled by two effects of the committed library. `campfire_sparks` is played by four groups,
 * and `campfire_boar_grill_drop_smoke` only spawned, at each birth of a `campfire_boar_grill` drop particle.
 */
describe("particle find", () => {
  const box = new Sandbox(__filename);

  let sprites: CliResult;
  let groups: CliResult;

  beforeAll(() => {
    sprites = box.run("particle find", ["--path", LIBRARY, "--texture", "PFX/pfx_splash_02.dds"]);
    groups = box.run("particle find", [
      "--path",
      LIBRARY,
      "--effect",
      "explosions\\effects\\campfire_sparks",
      "--effect",
      "explosions\\effects\\campfire_boar_grill_drop_smoke",
      "--silent",
      "--report",
      box.at("report.json"),
    ]);
  });

  // A texture is matched as the engine finds it: in any case, with either slash and with any extension.
  it("should find the effects sampling a texture however it is spelled", () => {
    expect(sprites).toMatchSnapshot();
  });

  it("should report the groups playing an effect and the one spawning it as a birth child", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should carry its matches under the envelope result", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

    expect(envelope.command).toEqual(["particle", "find"]);
    expect(envelope.outcome).toBe("success");
    expect(groups.exitCode).toBe(0);
  });

  it("should refuse an action type the library format has not", () => {
    expect(box.run("particle find", ["--path", LIBRARY, "--action", "Flicker"], { expectExit: 2 })).toMatchSnapshot();
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
