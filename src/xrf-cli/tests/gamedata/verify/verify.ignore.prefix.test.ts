import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const GAMEDATA = gamedata();
const FINDINGS = { expectExit: 3 };

describe("gamedata verify ignored prefixes", () => {
  const box = new Sandbox(__filename);

  let partial: CliResult;
  let partialBackslash: CliResult;
  let essentialFile: CliResult;
  let otherSubtree: CliResult;
  let nothingMatched: CliResult;

  beforeAll(() => {
    partial = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "--ignore", "configs/misc"], FINDINGS);
    partialBackslash = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "--ignore", "configs\\misc"], FINDINGS);
    essentialFile = box.run(
      "gamedata verify",
      [GAMEDATA, "--checks", "ltx", "--ignore", "configs/system.ltx"],
      FINDINGS
    );
    otherSubtree = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "--ignore", "meshes/ogf"], FINDINGS);
    nothingMatched = box.run("gamedata verify", [GAMEDATA, "--checks", "ltx", "--ignore", "nonexistent"], FINDINGS);
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

  it("should narrow the LTX check when only system.ltx is ignored", () => {
    expect(essentialFile).toMatchSnapshot();
  });

  it("should leave a check alone when the prefix names another subtree", () => {
    expect(otherSubtree).toMatchSnapshot();
  });

  it("should ignore a prefix that matches nothing", () => {
    expect(nothingMatched).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
