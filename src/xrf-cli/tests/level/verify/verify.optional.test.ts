import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Which of a level's files it may ship without.
 */
describe("level verify optional files", () => {
  const box = new Sandbox(__filename);

  let withoutFastGeometry: CliResult;
  let withoutBundle: CliResult;
  let withoutGeometry: CliResult;

  beforeAll(() => {
    box.copyIn(resource("levels/triangle"), "no-geomx");
    fs.rmSync(box.at("no-geomx/level.geomx"));

    box.copyIn(resource("levels/triangle"), "no-bundle");
    fs.rmSync(box.at("no-bundle/level"));

    box.copyIn(resource("levels/triangle"), "no-geom");
    fs.rmSync(box.at("no-geom/level.geom"));

    withoutFastGeometry = box.run("level verify", ["--path", box.at("no-geomx"), "--report", box.at("no-geomx.json")]);
    withoutBundle = box.run("level verify", ["--path", box.at("no-bundle"), "--report", box.at("no-bundle.json")], {
      expectExit: 3,
    });
    withoutGeometry = box.run("level verify", ["--path", box.at("no-geom"), "--report", box.at("no-geom.json")]);
  });

  it("should pass a level compiled with no fast geometry", () => {
    expect(envelopeAt(box.at("no-geomx.json"))).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: { status: "passed" },
    });
    expect(withoutFastGeometry).toMatchSnapshot();
  });

  // The fast path is skipped rather than reported, so the visual still verifies through its ordinary container.
  it("should still verify the visual that had a fast path", () => {
    const { checks } = envelopeAt(box.at("no-geomx.json")).result as {
      checks: Array<{ id: string; findings: Array<unknown> }>;
    };

    expect(checks.every(({ findings }) => findings.length === 0)).toBe(true);
  });

  it("should report an absent bundle rather than passing with nothing to check", () => {
    expect(envelopeAt(box.at("no-bundle.json"))).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        status: "failed",
        checks: expect.arrayContaining([
          expect.objectContaining({
            id: "read",
            status: "failed",
            findings: expect.arrayContaining([
              expect.objectContaining({ ruleId: "level.read" }),
              expect.objectContaining({ ruleId: "level.visuals.read" }),
            ]),
          }),
        ]),
      },
    });
    expect(withoutBundle).toMatchSnapshot();
  });

  // A bundle whose geometry is gone has nothing to address, which is a level built wrong rather than one read wrong;
  // the visuals are simply never drawn from.
  it("should pass a bundle whose geometry is absent, having addressed none of it", () => {
    expect(envelopeAt(box.at("no-geom.json"))).toMatchObject({ exitCode: 0, result: { status: "passed" } });
    expect(withoutGeometry.stdout).toEqual(
      expect.arrayContaining(["Addressed 0 vertices and 0 indices against a 4 entry shader table"])
    );
  });

  it("should preserve fixture bytes and write only the requested reports", () => {
    expect(box.manifest({ normalized: ["no-geomx.json", "no-bundle.json", "no-geom.json"] })).toMatchSnapshot();
  });
});
