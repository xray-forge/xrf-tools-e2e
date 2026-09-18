import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt, envelopeOf } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const FAILURES = [
  { name: "missing", check: "read", rules: ["level.read", "level.visuals.read"] },
  { name: "truncated", check: "read", rules: ["level.read", "level.visuals.read"] },
  { name: "minimal", check: "read", rules: ["level.shaders.absent"] },
  { name: "broken-geometry", check: "read", rules: ["level.geometry.read"] },
  { name: "invalid-shader", check: "ranges", rules: ["level.visuals.shader.out_of_range"] },
  { name: "malformed-shader", check: "ranges", rules: ["level.visuals.shader.malformed"] },
  {
    name: "invalid-range",
    check: "ranges",
    rules: ["level.visuals.indices.not_triangles", "level.visuals.vertices.unreadable"],
  },
  {
    name: "invalid-geometry",
    check: "geometry",
    rules: ["level.visuals.indices.out_of_range", "level.visuals.vertices.not_finite"],
  },
  { name: "invalid-fastpath", check: "geometry", rules: ["level.visuals.indices.out_of_range"] },
];

describe("level verify report", () => {
  const box = new Sandbox(__filename);
  const reports: Array<string> = ["triangle.json", ...FAILURES.map(({ name }) => `${name}.json`)];

  let verbose: CliResult;
  let json: CliResult;
  let failed: CliResult;
  let usage: CliResult;

  beforeAll(() => {
    box.copyIn(resource("levels/triangle"), "triangle");

    verbose = box.run("level verify", ["--path", box.at("triangle"), "--verbose", "--report", box.at("triangle.json")]);
    json = box.run("level verify", ["--path", box.at("triangle"), "--silent", "--json"]);

    for (const { name } of FAILURES) {
      if (name !== "missing") {
        box.copyIn(resource(`levels/${name}`), name);
      }

      box.run("level verify", ["--path", box.at(name), "--report", box.at(`${name}.json`)], { expectExit: 3 });
    }

    failed = box.run("level verify", ["--path", box.at("invalid-geometry")], { expectExit: 3 });
    usage = box.run("level verify", [], { expectExit: 2 });
  });

  it("should pass every check for drawable geometry", () => {
    expect(envelopeAt(box.at("triangle.json"))).toMatchObject({
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
    expect(box.json("triangle.json")).toMatchSnapshot();
  });

  it("should expose decoded bounds and geometry layouts in verbose output", () => {
    expect(verbose).toMatchSnapshot();
  });

  it("should emit a single JSON envelope in silent pipe mode", () => {
    expect(json.stderr).toEqual([]);
    expect(envelopeOf(json)).toEqual(box.json("triangle.json"));
  });

  it.each(FAILURES)("should report $name findings with a check-failure exit", ({ name, check, rules }) => {
    expect(envelopeAt(box.at(`${name}.json`))).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        status: "failed",
        checks: expect.arrayContaining([
          expect.objectContaining({
            id: check,
            status: "failed",
            findings: expect.arrayContaining(rules.map((ruleId) => expect.objectContaining({ ruleId }))),
          }),
        ]),
      },
    });
    expect(box.json(`${name}.json`)).toMatchSnapshot();
  });

  it("should print all geometry findings and their failure count", () => {
    expect(failed).toMatchSnapshot();
  });

  it("should require a level directory", () => {
    expect(usage).toMatchSnapshot();
  });

  it("should preserve fixture bytes and write only the requested reports", () => {
    expect(box.manifest({ normalized: reports })).toMatchSnapshot();
  });
});
