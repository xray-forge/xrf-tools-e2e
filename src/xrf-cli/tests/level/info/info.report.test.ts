import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("level info report", () => {
  const box = new Sandbox(__filename);
  const failures: Array<string> = ["missing", "truncated", "broken-geometry"];
  const reports: Array<string> = ["triangle.json", "minimal.json", ...failures.map((name) => `${name}.json`)];

  let verbose: CliResult;
  let usage: CliResult;

  beforeAll(() => {
    for (const name of ["triangle", "minimal", "truncated", "broken-geometry"]) {
      box.copyIn(resource(`levels/${name}`), name);
    }

    verbose = box.run("level info", ["--path", box.at("triangle"), "--verbose", "--report", box.at("triangle.json")]);
    box.run("level info", ["--path", box.at("minimal"), "--report", box.at("minimal.json")]);

    for (const name of failures) {
      box.run("level info", ["--path", box.at(name), "--report", box.at(`${name}.json`)], { expectExit: 1 });
    }

    usage = box.run("level info", [], { expectExit: 2 });
  });

  it("should report one drawable triangle and both geometry files", () => {
    expect(envelopeAt(box.at("triangle.json")).result).toMatchObject({
      header: { xrlcVersion: 14, xrlcQuality: 1 },
      shaders: { total: 4, references: 2, lightmapped: 1, empty: 1, malformed: 1 },
      visuals: { total: 1, drawable: 1, fastpath: 1, vertices: 3, indices: 3, triangles: 1 },
      geometry: { vertexBuffers: 1, indexBuffers: 1, vertices: 3, indices: 3 },
      detailGeometry: { vertexBuffers: 1, indexBuffers: 1, vertices: 3, indices: 3 },
    });
    expect(box.json("triangle.json")).toMatchSnapshot();
  });

  it("should describe the visual and buffer counts in verbose output", () => {
    expect(verbose).toMatchSnapshot();
  });

  it("should distinguish absent optional chunks from empty geometry", () => {
    expect(envelopeAt(box.at("minimal.json")).result).toMatchObject({
      visuals: null,
      geometry: null,
      detailGeometry: null,
    });
    expect(box.json("minimal.json")).toMatchSnapshot();
  });

  it.each(failures)("should reject %s input without a partial result", (name: string) => {
    expect(envelopeAt(box.at(`${name}.json`))).toMatchObject({
      exitCode: 1,
      outcome: "executionFailed",
      error: expect.any(String),
      result: null,
    });
    expect(box.json(`${name}.json`)).toMatchSnapshot();
  });

  it("should require a level directory", () => {
    expect(usage).toMatchSnapshot();
  });

  it("should preserve the authored inputs and write only the requested reports", () => {
    for (const name of ["triangle/level", "triangle/level.geom", "triangle/level.geomx", "minimal/level"]) {
      expect(fs.readFileSync(box.at(name))).toEqual(fs.readFileSync(resource(`levels/${name}`)));
    }

    expect(box.manifest({ normalized: reports })).toMatchSnapshot();
  });
});
