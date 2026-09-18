import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("level verify sectors and portals", () => {
  const box = new Sandbox(__filename);
  const scenarios: Array<string> = ["sectors", "invalid-sectors", "truncated-portals"];

  let valid: CliResult;
  let invalid: CliResult;

  beforeAll(() => {
    for (const name of scenarios) {
      box.copyIn(resource(`levels/${name}`), name);
    }

    valid = box.run("level verify", ["--path", box.at("sectors"), "--report", box.at("sectors.json")]);
    invalid = box.run(
      "level verify",
      ["--path", box.at("invalid-sectors"), "--report", box.at("invalid-sectors.json")],
      { expectExit: 3 }
    );
    box.run("level verify", ["--path", box.at("truncated-portals"), "--report", box.at("truncated-portals.json")], {
      expectExit: 3,
    });
  });

  it("should accept linked sectors and portals with three and six vertices", () => {
    expect(envelopeAt(box.at("sectors.json"))).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        status: "passed",
        checks: [
          { id: "read", status: "passed", findings: [] },
          { id: "ranges", status: "passed", findings: [] },
          { id: "geometry", status: "passed", findings: [] },
        ],
      },
    });
    expect(box.json("sectors.json")).toMatchSnapshot();
  });

  it("should count sectors, portal references and static lights including the sun", () => {
    expect(valid.stdout).toEqual(
      expect.arrayContaining([
        "2 sectors joined by 2 portals, named 4 times between them",
        "2 static lights, one of them the sun",
      ])
    );
    expect(valid).toMatchSnapshot();
  });

  it("should report invalid roots, portal references and both portal sides together", () => {
    expect(envelopeAt(box.at("invalid-sectors.json"))).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      error: "Check failed: 6 finding(s)",
      result: {
        status: "failed",
        checks: [
          { id: "read", status: "passed", findings: [] },
          {
            id: "ranges",
            status: "failed",
            findings: [
              { ruleId: "level.portals.sector.out_of_range" },
              { ruleId: "level.portals.sector.out_of_range" },
              { ruleId: "level.sectors.portal.out_of_range" },
              { ruleId: "level.sectors.root.out_of_range" },
            ],
          },
          {
            id: "geometry",
            status: "failed",
            findings: [
              { ruleId: "level.portals.not_a_polygon", message: expect.stringContaining("spans 2 vertices") },
              { ruleId: "level.portals.not_a_polygon", message: expect.stringContaining("spans 7 vertices") },
            ],
          },
        ],
      },
    });
    expect(box.json("invalid-sectors.json")).toMatchSnapshot();
  });

  it("should print every sector and portal finding with the total count", () => {
    expect(invalid).toMatchSnapshot();
  });

  it("should reject a partial portal record as a read finding", () => {
    expect(envelopeAt(box.at("truncated-portals.json"))).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        status: "failed",
        checks: expect.arrayContaining([
          expect.objectContaining({
            id: "read",
            status: "failed",
            findings: [
              expect.objectContaining({
                ruleId: "level.read",
                message: expect.stringContaining("159 bytes"),
              }),
            ],
          }),
        ]),
      },
    });
    expect(box.json("truncated-portals.json")).toMatchSnapshot();
  });

  it("should preserve fixture bytes and write only the requested reports", () => {
    expect(box.manifest({ normalized: scenarios.map((name) => `${name}.json`) })).toMatchSnapshot();
  });
});
