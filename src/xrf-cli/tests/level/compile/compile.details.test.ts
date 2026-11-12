import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Lighting a level's details with `level compile --steps details`, no SDK named.
 *
 * `details-build` is a game data tree written by `xrf-level-compiler`'s own tests through the tools' writers: one
 * shadow-casting compiler shader, one opaque texture's `.thm`, and a level directory of a five-slot grid (two slots
 * lit, one touching no face, one emptied, one unplanted) over a ground and a roof, under a sun and a red point light.
 */
describe("level compile details", () => {
  const box = new Sandbox(__filename);

  let lit: CliResult;
  let refused: CliResult;
  let forced: CliResult;
  let sdkless: CliResult;

  beforeAll(() => {
    box.copyIn(resource("levels/details-build"), "gamedata");

    const level: string = box.at("gamedata/levels/test_level");

    lit = box.run("level compile", ["--path", level, "--steps", "details", "--report", box.at("lit.json")]);
    refused = box.run("level compile", ["--path", level, "--steps", "details", "--report", box.at("refused.json")], {
      expectExit: 1,
    });
    forced = box.run("level compile", ["--path", level, "--steps", "details", "--force"]);
    sdkless = box.run("level compile", ["--path", level, "--steps", "ai", "--report", box.at("sdkless.json")], {
      expectExit: 1,
    });
  });

  it("should light the details without the SDK, reporting how it met the slots", () => {
    expect(lit.exitCode).toBe(0);
    expect(envelopeAt(box.at("lit.json"))).toMatchObject({
      exitCode: 0,
      result: {
        work: null,
        steps: [
          {
            step: "details",
            run: { kind: "detailLighter", slots: { unplanted: 1, emptied: 1, untouched: 1, lit: 2 } },
          },
        ],
      },
    });
  });

  it("should refuse to overwrite level.details unless forced", () => {
    expect(envelopeAt(box.at("refused.json"))).toMatchObject({
      exitCode: 1,
      error: expect.stringContaining("force the compile to overwrite it"),
    });
    expect(refused).toMatchSnapshot();
    expect(forced.exitCode).toBe(0);
  });

  it("should refuse a step the SDK runs without the SDK", () => {
    expect(envelopeAt(box.at("sdkless.json"))).toMatchObject({
      exitCode: 1,
      error: expect.stringContaining("The ai step runs the SDK's compiler"),
    });
    expect(sdkless).toMatchSnapshot();
  });

  it("should write level.details beside the build files and only the requested reports", () => {
    expect(box.manifest({ normalized: ["lit.json", "refused.json", "sdkless.json"] })).toMatchSnapshot();
  });
});
