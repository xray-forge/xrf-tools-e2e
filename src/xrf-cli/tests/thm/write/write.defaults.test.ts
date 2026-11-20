import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeOf, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

// A texture shipped without a descriptor.
const TEXTURE = gamedata("textures/prop_lampa_g.dds");

describe("thm write defaults", () => {
  const box = new Sandbox(__filename);

  let piped: CliResult;
  let written: CliResult;
  let readBack: CliResult;
  let printed: CliResult;
  let refused: CliResult;

  beforeAll(() => {
    const texture = box.copyIn(TEXTURE, "lamp.dds");

    piped = box.run("thm write", [texture, "--dry-run", "--json"]);
    box.run("thm write", [texture, "--dry-run", "--report", box.at("dry.json")]);
    written = box.run("thm write", [texture, "--report", box.at("write.json")]);
    readBack = box.run("thm info", [box.at("lamp.thm"), "--json"]);
    printed = box.run("thm info", [box.at("lamp.thm")]);
    refused = box.run("thm write", [texture], { expectExit: 1 });
  });

  it("should describe the same write on stdout and in a report", () => {
    expect(envelopeOf(piped).result).toEqual((box.json("dry.json") as CommandEnvelope).result);
  });

  it("should write a descriptor beside the texture", () => {
    expect(written).toMatchSnapshot();
  });

  it("should give the descriptor the SDK defaults with the texture's size and format", () => {
    expect(box.json("write.json")).toMatchSnapshot();
    expect(printed).toMatchSnapshot();
  });

  it("should read back as the descriptor it reported writing", () => {
    const report = (box.json("write.json") as CommandEnvelope).result as { descriptor: unknown };

    expect(envelopeOf(readBack).result).toEqual({ kind: "texture", file: report.descriptor });
  });

  it("should refuse to replace a descriptor without force", () => {
    expect(refused).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["dry.json", "write.json"] })).toMatchSnapshot();
  });
});
