import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const LIBRARY = gamedata("particles.xr");

/**
 * What `particle list` says about a library.
 *
 * @remarks
 * The committed library holds nine campfire groups and the six `campfire_boar_grill` effects, whose drop spawns a
 * smoke at each particle's birth and sparks at its death.
 */
describe("particle list", () => {
  const box = new Sandbox(__filename);

  let groups: CliResult;

  beforeAll(() => {
    groups = box.run("particle list", ["--path", LIBRARY, "--kind", "group", "--name", "CAMPFIRE"]);
    box.run("particle list", [
      "--path",
      LIBRARY,
      "--kind",
      "effect",
      "--name",
      "campfire_boar_grill",
      "--silent",
      "--report",
      box.at("report.json"),
    ]);
  });

  // The name filter ignores case, as engine names do.
  it("should list the groups holding a name with how many effects and children each has", () => {
    expect(groups).toMatchSnapshot();
  });

  it("should report each effect's sprite, particles and action types", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should carry its entries under the envelope result", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

    expect(envelope.command).toEqual(["particle", "list"]);
    expect(envelope.outcome).toBe("success");
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
