import { beforeAll, describe, expect, it } from "@jest/globals";

import { ltxSchemesDltx } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Schemes judge the document the dialect resolved, not the one on disk.
 *
 * @remarks
 * `[wpn_ak74]` satisfies its strict scheme in the file that declares it. The patch beside it turns
 * `cost` into a word and deletes `rpm`, so the section the game would load fails - and only a run
 * that applied the patch can see it. Standard rules cannot reach the question at all: they refuse the
 * patch file and report the untouched section as valid, which is the more dangerous of the two
 * answers and the reason this tree is separate from `gamedata-dltx`, where the patch keeps a run
 * clean.
 */
describe("ltx verify schemes --dltx", () => {
  const box = new Sandbox(__filename);

  let standard: CliResult;
  let dltx: CliResult;
  let said: string;

  beforeAll(() => {
    standard = box.run("ltx verify", ["--path", ltxSchemesDltx("configs")], { expectExit: 3 });
    dltx = box.run("ltx verify", ["--path", ltxSchemesDltx("configs"), "--dltx"], { expectExit: 3 });

    said = [...dltx.stdout, ...dltx.stderr].join("\n");
  });

  it("should refuse the patch file and judge the section unpatched without the flag", () => {
    expect(standard).toMatchSnapshot();
  });

  it("should find no scheme error in the file the patch has not reached", () => {
    // The one finding standard rules raise is the refusal to read the patch at all. The weapon itself
    // is reported as verified, which is exactly the false clean the dialect exists to remove.
    expect(standard.stdout).toContain("Verified 50.00%, 2 files, 1 sections, 3 fields");
    expect([...standard.stdout, ...standard.stderr].join("\n")).not.toContain("Ltx scheme error");
  });

  it("should fail the resolved section with the flag", () => {
    expect(dltx).toMatchSnapshot();
  });

  it("should refuse the value the patch wrote", () => {
    expect(said).toContain("[wpn_ak74] cost : Invalid value, unsigned 32 bit number is expected, got 'expensive'");
  });

  it("should report a required field the patch removed", () => {
    expect(said).toContain("[wpn_ak74] rpm : Required field was not provided");
  });

  it("should report both findings at the entry point the patch applies to", () => {
    // Same location rule as an included file: the resolved document belongs to `system.ltx`, so
    // neither the file declaring the section nor the file breaking it is named.
    expect(said).toContain("in '<resources>/ltx-schemes-dltx/configs/system.ltx' [wpn_ak74]");
    expect(said).not.toContain("w_ak74.ltx");
    expect(said).not.toContain("mod_system_zzz.ltx");
  });

  it("should write nothing in either mode", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
