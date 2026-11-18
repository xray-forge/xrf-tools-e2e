import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Lighting a level's details with `level compile --steps details`.
 *
 * `compile-build` is a game data tree written by `xrf-level-compiler`'s own tests through the tools' writers: one
 * shadow-casting compiler shader, one opaque texture's `.thm`, and a level directory of a five-slot grid (two slots
 * lit, one touching no face, one emptied, one unplanted) over a ground and a roof, under a sun and a red point light,
 * with a four-node AI map beside them.
 *
 * Every run asks for the CPU, the reference: the default, `auto`, traces on whatever GPU the machine has, so its report
 * names that GPU. The GPU backend's agreement with the CPU is `xrf-level-compiler`'s tests'.
 */
describe("level compile details", () => {
  const box = new Sandbox(__filename);

  let lit: CliResult;
  let refused: CliResult;
  let forced: CliResult;
  let lightAlone: CliResult;

  beforeAll(() => {
    box.copyIn(resource("levels/compile-build"), "gamedata");

    const level: string = box.at("gamedata/levels/test_level");
    const details: Array<string> = ["--path", level, "--steps", "details", "--backend", "cpu"];

    lit = box.run("level compile", [...details, "--report", box.at("lit.json")]);
    refused = box.run("level compile", [...details, "--report", box.at("refused.json")], { expectExit: 1 });
    forced = box.run("level compile", [...details, "--force"]);
    lightAlone = box.run(
      "level compile",
      ["--path", level, "--steps", "light", "--report", box.at("light-alone.json")],
      { expectExit: 1 }
    );
  });

  it("should light the details, reporting how it met the slots", () => {
    expect(lit.exitCode).toBe(0);
    expect(envelopeAt(box.at("lit.json"))).toMatchObject({
      exitCode: 0,
      result: {
        steps: [
          {
            step: "details",
            run: { kind: "detailLighter", slots: { unplanted: 1, emptied: 1, untouched: 1, lit: 2 }, gpu: null },
          },
        ],
      },
    });
  });

  it("should refuse to overwrite level.details unless forced", () => {
    expect(envelopeAt(box.at("refused.json"))).toMatchObject({
      exitCode: 1,
      error: expect.stringContaining("already holds what this run writes (level.details); force it to replace them"),
    });
    expect(refused).toMatchSnapshot();
    expect(forced.exitCode).toBe(0);
  });

  it("should refuse the light step without the geometry step before running anything", () => {
    expect(envelopeAt(box.at("light-alone.json"))).toMatchObject({
      exitCode: 1,
      error: expect.stringContaining("The light step runs only with the geometry step"),
    });
    expect(lightAlone).toMatchSnapshot();
  });

  it("should write level.details beside the build files and only the requested reports", () => {
    expect(box.manifest({ normalized: ["lit.json", "refused.json", "light-alone.json"] })).toMatchSnapshot();
  });
});
