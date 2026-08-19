import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const GAMEDATA = gamedata();

/**
 * Sorts captured output so an unordered check can still be compared.
 *
 * @remarks
 * The meshes check verifies in parallel and logs each finding as its worker finishes, so the same
 * four meshes are reported in a different order between two runs of the same binary. The findings
 * go to stderr, and the set is stable: sorted and with timings normalized, both streams hash
 * identically across runs, and the json report of the same run is byte-stable. Only the console
 * path is affected.
 *
 * todo: sort the meshes findings in the tools repository before logging them, then drop this and
 * snapshot the output in the order the command prints it.
 *
 * @param result - Result whose output is unordered.
 * @returns The same result with both streams sorted.
 */
function sorted(result: CliResult): CliResult {
  return { ...result, stdout: [...result.stdout].sort(), stderr: [...result.stderr].sort() };
}

describe("verify-gamedata check selection", () => {
  const box = new Sandbox(__filename);

  let ltx: CliResult;
  let scripts: CliResult;
  let meshes: CliResult;
  let meshesIgnored: CliResult;
  let ltxIgnored: CliResult;
  let strict: CliResult;

  beforeAll(() => {
    // The configs are in vanilla rather than formatter shape, so the ltx check has findings and
    // answers non-zero on its own.
    ltx = box.run("verify-gamedata", [GAMEDATA, "--checks", "ltx"], { expectExit: 1 });

    // The tree ships no scripts, so this check passes with nothing to say. Running one check at a
    // time is what shows that a non-zero answer comes from a named check rather than the whole run.
    scripts = box.run("verify-gamedata", [GAMEDATA, "--checks", "scripts"]);

    meshes = box.run("verify-gamedata", [GAMEDATA, "--checks", "meshes"], { expectExit: 1 });

    // --ignore replaces the default ignore list rather than adding to it, and it reaches the checks
    // that walk assets: ignoring the meshes directory leaves the check with nothing to inspect.
    meshesIgnored = box.run("verify-gamedata", [GAMEDATA, "--checks", "meshes", "--ignore", "meshes"]);

    // It does not reach the ltx check, which resolves configs through the ltx project rather than
    // through the asset walk, so the same findings survive being told to ignore the directory.
    ltxIgnored = box.run("verify-gamedata", [GAMEDATA, "--checks", "ltx", "--ignore", "configs"], { expectExit: 1 });

    strict = box.run("verify-gamedata", [GAMEDATA, "--checks", "meshes", "--strict"], { expectExit: 1 });
  });

  it("should report findings from one named check", () => {
    expect(ltx).toMatchSnapshot();
  });

  it("should pass a check with nothing to inspect", () => {
    expect(scripts).toMatchSnapshot();
  });

  it("should verify meshes", () => {
    expect(sorted(meshes)).toMatchSnapshot();
  });

  it("should leave the meshes check nothing to inspect when ignored", () => {
    expect(meshesIgnored).toMatchSnapshot();
  });

  it("should still report ltx findings for an ignored configs directory", () => {
    expect(ltxIgnored).toMatchSnapshot();
  });

  // Recorded as current behaviour: strict is meant to validate expensive payloads fully, and on
  // this tree it reaches the same conclusion as the ordinary run.
  it("should reach the same conclusion under strict", () => {
    expect(sorted(strict)).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
