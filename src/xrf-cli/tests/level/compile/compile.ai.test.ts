import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Compiling a level's AI map with `level compile --steps ai`.
 *
 * `compile-build`'s level holds a four-node map (`build.aimap`, `xrf-level-compiler`'s AI tests' own) beside the ray
 * model and build project its covers are traced against. Every run asks for the CPU, the reference: `auto` traces on
 * whatever GPU the machine has, so its report names that GPU.
 */
describe("level compile ai", () => {
  const box = new Sandbox(__filename);

  let full: CliResult;
  let refused: CliResult;
  let forced: CliResult;
  let draft: CliResult;

  beforeAll(() => {
    box.copyIn(resource("levels/compile-build"), "gamedata");
    box.copyIn(resource("levels/compile-build/levels/test_level/build.aimap"), "draft/build.aimap");

    const level: string = box.at("gamedata/levels/test_level");
    const ai: Array<string> = ["--path", level, "--steps", "ai", "--backend", "cpu"];

    full = box.run("level compile", [...ai, "--report", box.at("full.json")]);
    refused = box.run("level compile", [...ai, "--report", box.at("refused.json")], { expectExit: 1 });
    forced = box.run("level compile", [...ai, "--force", "--report", box.at("forced.json")]);
    // A directory of the nodes alone, no ray model and no game data: what none needs.
    draft = box.run("level compile", [
      "--path",
      box.at("draft"),
      "--steps",
      "ai",
      "--ai-covers",
      "none",
      "--gamedata",
      box.at("no-gamedata"),
      "--report",
      box.at("draft.json"),
    ]);
  });

  it("should compile the map with full covers, checked as a graph", () => {
    expect(full.exitCode).toBe(0);
    expect(envelopeAt(box.at("full.json"))).toMatchObject({
      exitCode: 0,
      result: {
        steps: [
          {
            step: "ai",
            run: {
              kind: "aiMapCompiler",
              covers: "full",
              gpu: null,
              guid: "derived",
              census: { nodes: 4, selfLinks: 0, components: 1 },
              graph: { status: "passed" },
            },
          },
        ],
      },
    });
    expect(full).toMatchSnapshot();
  });

  it("should refuse to overwrite level.ai unless forced, keeping its identity when forced", () => {
    expect(refused.exitCode).toBe(1);
    expect(envelopeAt(box.at("refused.json"))).toMatchObject({
      exitCode: 1,
      error: expect.stringContaining("already holds what this run writes (level.ai); force it to replace them"),
    });
    expect(forced.exitCode).toBe(0);
    expect(envelopeAt(box.at("forced.json"))).toMatchObject({
      result: { steps: [{ run: { kind: "aiMapCompiler", guid: "kept" } }] },
    });
  });

  it("should compile with no covers from the nodes alone", () => {
    expect(draft.exitCode).toBe(0);
    expect(envelopeAt(box.at("draft.json"))).toMatchObject({
      result: { steps: [{ step: "ai", run: { kind: "aiMapCompiler", covers: "none", gpu: null } }] },
    });
  });

  it("should write level.ai beside the build files and only the requested reports", () => {
    expect(box.manifest({ normalized: ["full.json", "refused.json", "forced.json", "draft.json"] })).toMatchSnapshot();
  });
});
