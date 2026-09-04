import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedataDltx } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * The DLTX patch dialect is opt-in, and this is what that opt-in buys and costs.
 *
 * @remarks
 * The config tree here carries `mod_system_*.ltx` patch files, which are Monolith and Anomaly
 * behaviour rather than vanilla LTX. Without `--dltx` the tool refuses them, which is the point: a
 * patch file read under standard rules would otherwise resolve to something the game never loads.
 */
describe("ltx verify --dltx", () => {
  const box = new Sandbox(__filename);

  let standard: CliResult;
  let dltx: CliResult;

  beforeAll(() => {
    // Exit 3 is a failed check rather than a broken command: standard rules found real errors, which
    // is the behaviour under test.
    standard = box.run("ltx verify", ["--path", gamedataDltx("configs")], { expectExit: 3 });
    dltx = box.run("ltx verify", ["--path", gamedataDltx("configs"), "--dltx"]);
  });

  it("should refuse patch files without the flag", () => {
    expect(standard).toMatchSnapshot();
  });

  it("should name the flag that would evaluate them", () => {
    // Per-finding detail goes to stderr; the answer a caller reads is the report, which the sibling
    // report suite snapshots. Joined because these are normalized lines rather than one string.
    const said: string = [...standard.stdout, ...standard.stderr].join(" ");

    expect(said).toContain("needs the dltx dialect");
    expect(said).toContain("--dltx");
  });

  it("should fail without the flag", () => {
    expect(standard.exitCode).toBe(3);
  });

  it("should accept the same tree with the flag", () => {
    expect(dltx).toMatchSnapshot();
  });

  it("should succeed with the flag", () => {
    expect(dltx.exitCode).toBe(0);
  });

  it("should treat a patch file as an attachment rather than an entry point", () => {
    // Both modes see the same five files. Standard LTX verifies each patch file as a config of its
    // own, which is what fails; the dialect knows the two belong to `system.ltx`, so it has one
    // fewer entry point to verify and finds nothing wrong.
    expect(standard.stdout.join(" ")).toContain("3 files");
    expect(dltx.stdout.join(" ")).toContain("1 files");
  });

  it("should write nothing in either mode", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
