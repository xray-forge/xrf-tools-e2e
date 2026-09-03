import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const GAMEDATA = gamedata();

/**
 * `--ignore` takes logical prefixes rather than paths: separators are normalized before comparison,
 * a prefix covers everything beneath it, and a value matching nothing is simply inert.
 */
describe("gamedata verify ignore list", () => {
  const box = new Sandbox(__filename);

  let partial: CliResult;
  let partialBackslash: CliResult;
  let essentialDirectory: CliResult;
  let essentialFile: CliResult;
  let unrelatedCheck: CliResult;
  let otherSubtree: CliResult;
  let nothingMatched: CliResult;
  let nonEssential: CliResult;

  beforeAll(() => {
    // A run that judged the content and found problems answers 3.
    const findings = { expectExit: 3 };

    // Narrows the ltx check from seven config files to six; the project still opens because
    // system.ltx is outside the ignored subtree.
    partial = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "--ignore", "configs/misc"], findings);
    partialBackslash = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "--ignore", "configs\\misc"], findings);

    // Project identity is decided before inspection filters apply. Ignoring configs empties the LTX check; ignoring
    // system.ltx narrows it to the remaining six config files.
    essentialDirectory = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "--ignore", "configs"]);
    essentialFile = box.run(
      "gamedata verify",
      [GAMEDATA, "--checks", "ltx", "--ignore", "configs/system.ltx"],
      findings
    );

    // Meshes never reads configs, so its usual findings must be reported despite the ignored config tree. See issue 0001.
    unrelatedCheck = box.run("gamedata verify", [GAMEDATA, "--checks", "meshes", "--ignore", "configs"], findings);

    // A prefix pointing at a different subtree, and one matching nothing at all, both leave the
    // check with its full seven files.
    otherSubtree = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "--ignore", "meshes/ogf"], findings);
    nothingMatched = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "--ignore", "nonexistent"], findings);

    // The flag doing its job: a non-essential subtree is filtered out and the check finds nothing.
    nonEssential = box.run("gamedata verify", [GAMEDATA, "--checks", "meshes", "--ignore", "meshes"]);
  });

  it("should narrow a check to the unignored part of a subtree", () => {
    expect(partial).toMatchSnapshot();
  });

  // Prefixes are normalized, so the separator a caller happens to type cannot change the result.
  // The opening line is excluded because it echoes the value as typed, which is the one place the
  // two runs are expected to read differently.
  it("should treat both separators as the same prefix", () => {
    const withoutEcho = (result: CliResult): Array<string> =>
      result.stdout.filter((line) => !line.startsWith("Root: "));

    expect(withoutEcho(partialBackslash)).toEqual(withoutEcho(partial));
  });

  it("should empty the LTX check when the configs directory is ignored", () => {
    expect(essentialDirectory).toMatchSnapshot();
  });

  it("should narrow the LTX check when only system.ltx is ignored", () => {
    expect(essentialFile).toMatchSnapshot();
  });

  it("should run a check that never reads the ignored prefix", () => {
    expect(unrelatedCheck).toMatchSnapshot();
  });

  it("should leave a check alone when the prefix names another subtree", () => {
    expect(otherSubtree).toMatchSnapshot();
  });

  it("should ignore a prefix that matches nothing", () => {
    expect(nothingMatched).toMatchSnapshot();
  });

  it("should empty a check whose subtree is ignored", () => {
    expect(nonEssential).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
