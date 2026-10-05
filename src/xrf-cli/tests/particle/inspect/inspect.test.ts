import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const LIBRARY = gamedata("particles.xr");

/**
 * What `particle inspect` says about one effect or group.
 *
 * @remarks
 * `campfire_boar_grill_drop` runs eight actions; the `campfire_boar_grill` group plays it with a birth and a death
 * child. No name is `campfire_boar`, which several names hold.
 */
describe("particle inspect", () => {
  const box = new Sandbox(__filename);

  let effect: CliResult;
  let group: CliResult;
  let missing: CliResult;

  beforeAll(() => {
    effect = box.run("particle inspect", ["--path", LIBRARY, "explosions\\effects\\campfire_boar_grill_drop"]);
    group = box.run("particle inspect", ["--path", LIBRARY, "EXPLOSIONS\\CAMPFIRE_BOAR_GRILL"]);
    missing = box.run("particle inspect", ["--path", LIBRARY, "campfire_boar"], { expectExit: 1 });
    box.run("particle inspect", [
      "--path",
      LIBRARY,
      "explosions\\campfire_boar_grill",
      "--silent",
      "--report",
      box.at("report.json"),
    ]);
  });

  it("should explain an effect's sprite, flags, frames and actions", () => {
    expect(effect).toMatchSnapshot();
  });

  // The name is matched in any case, as engine names are.
  it("should explain a group's effects, their windows and the children they spawn", () => {
    expect(group).toMatchSnapshot();
  });

  it("should fail on a missing name, naming the names holding it", () => {
    expect(missing).toMatchSnapshot();
  });

  it("should report the group whole, as the library holds it", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should carry the group under the envelope result", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

    expect(envelope.command).toEqual(["particle", "inspect"]);
    expect(envelope.outcome).toBe("success");
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
