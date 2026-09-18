import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What a level is built out of beside its geometry, and naming one by its installation rather than by a path.
 */
describe("level info structure", () => {
  const box = new Sandbox(__filename);

  let structure: CliResult;
  let byName: CliResult;
  let withoutStructure: CliResult;

  beforeAll(() => {
    box.copyIn(resource("levels/sectors"), "root/levels/zaton");
    box.copyIn(resource("levels/triangle"), "triangle");

    structure = box.run("level info", ["--path", box.at("root/levels/zaton"), "--report", box.at("structure.json")]);
    byName = box.run("level info", [
      "--root",
      box.at("root"),
      "--level",
      "zaton",
      "--source",
      "directory",
      "--report",
      box.at("by-name.json"),
    ]);
    withoutStructure = box.run("level info", [
      "--path",
      box.at("triangle"),
      "--report",
      box.at("without-structure.json"),
    ]);
  });

  it("should report the sectors, portals and lights the bundle carries", () => {
    expect(envelopeAt(box.at("structure.json")).result).toMatchObject({
      structure: {
        sectors: 2,
        portals: 2,
        sectorPortalReferences: 4,
        lights: 2,
        hasSun: true,
      },
    });
    expect(structure.stdout).toEqual(
      expect.arrayContaining(["2 sectors, 2 portals, 2 static lights, one of them the sun"])
    );
    expect(structure).toMatchSnapshot();
  });

  // Two sectors naming two portals four times is each portal named by both sectors it joins, which is what a portal
  // joining two sectors means.
  it("should count a portal once for each sector naming it", () => {
    const { structure: counted } = envelopeAt(box.at("structure.json")).result as {
      structure: { portals: number; sectorPortalReferences: number };
    };

    expect(counted.sectorPortalReferences).toBe(counted.portals * 2);
  });

  it("should read the same level named by its installation", () => {
    expect(byName.stdout).toEqual(expect.arrayContaining(["Read compiled level levels\\zaton"]));
    expect(envelopeAt(box.at("by-name.json")).result).toEqual(envelopeAt(box.at("structure.json")).result);
  });

  it("should state a level carrying none of it without claiming a sun", () => {
    expect(envelopeAt(box.at("without-structure.json")).result).toMatchObject({
      structure: { sectors: 0, portals: 0, sectorPortalReferences: 0, lights: 0, hasSun: false },
    });
    expect(withoutStructure.stdout).toEqual(expect.arrayContaining(["0 sectors, 0 portals, 0 static lights"]));
  });

  it("should preserve fixture bytes and write only the requested reports", () => {
    expect(
      box.manifest({ normalized: ["structure.json", "by-name.json", "without-structure.json"] })
    ).toMatchSnapshot();
  });
});
