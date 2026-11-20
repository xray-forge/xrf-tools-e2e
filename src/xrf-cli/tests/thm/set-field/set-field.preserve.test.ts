import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeOf, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

// A descriptor the SDK wrote.
const SOURCE = gamedata("textures/act_cat_bump.thm");

interface Descriptor {
  kind: string;
  file: { textureParam: Record<string, unknown> } & Record<string, unknown>;
}

describe("thm set-field preservation", () => {
  const box = new Sandbox(__filename);

  let piped: CliResult;
  let edited: CliResult;
  let before: Descriptor;
  let after: Descriptor;
  let differing: Array<number>;
  let sizeChange: number;

  beforeAll(() => {
    const descriptor = box.copyIn(SOURCE, "cat.thm");
    const original = fs.readFileSync(descriptor);

    before = envelopeOf(box.run("thm info", [descriptor, "--json"])).result as Descriptor;
    piped = box.run("thm set-field", [descriptor, "--fade-amount", "40", "--dry-run", "--json"]);
    box.run("thm set-field", [descriptor, "--fade-amount", "40", "--dry-run", "--report", box.at("dry.json")]);
    edited = box.run("thm set-field", [descriptor, "--fade-amount", "40", "--report", box.at("edit.json")]);
    after = envelopeOf(box.run("thm info", [descriptor, "--json"])).result as Descriptor;

    const written = fs.readFileSync(descriptor);

    differing = [...original.keys()].filter((index) => original[index] !== written[index]);
    sizeChange = written.length - original.length;
  });

  it("should read back with only the field named changed", () => {
    expect(after).toEqual({
      ...before,
      file: { ...before.file, textureParam: { ...before.file.textureParam, fadeAmount: 40 } },
    });
  });

  it("should describe the same edit on stdout and in a report", () => {
    expect(envelopeOf(piped).result).toEqual((box.json("dry.json") as CommandEnvelope).result);
  });

  it("should report the descriptor it changed", () => {
    expect(edited).toMatchSnapshot();
    expect(box.json("edit.json")).toMatchSnapshot();
  });

  // The amount was zero, so setting it to 40 changes one byte and the size not at all.
  it("should change only the byte holding the field named", () => {
    expect(sizeChange).toBe(0);
    expect(differing).toHaveLength(1);
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["dry.json", "edit.json"] })).toMatchSnapshot();
  });
});
