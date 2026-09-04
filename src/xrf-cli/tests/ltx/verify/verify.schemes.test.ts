import { beforeAll, describe, expect, it } from "@jest/globals";

import { ltxSchemes } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What a scheme verification says, and where it says it happened.
 */
describe("ltx verify schemes", () => {
  const box = new Sandbox(__filename);

  let verify: CliResult;
  let verbose: CliResult;
  let said: string;

  beforeAll(() => {
    // Exit 3 is a failed check rather than a broken command: the findings are what this suite reads.
    verify = box.run("ltx verify", ["--path", ltxSchemes("configs")], { expectExit: 3 });
    verbose = box.run("ltx verify", ["--path", ltxSchemes("configs"), "--verbose"], { expectExit: 3 });

    said = [...verify.stdout, ...verify.stderr].join("\n");
  });

  it("should report every finding with its section, field and rule", () => {
    expect(verify).toMatchSnapshot();
  });

  it("should count the sections it judged against the ones it skipped", () => {
    // Eight sections, seven carrying a `$scheme`; `[system]` is the one that does not and is skipped
    // rather than failed, which is how a config tree of mostly untyped sections stays usable.
    expect(verify.stdout).toContain("Checked 5 files, 8 sections in <duration>");
    expect(verify.stdout).toContain("Verified 87.50%, 2 files, 7 sections, 21 fields");
  });

  it("should verify a section that inherits its scheme rather than declaring one", () => {
    // `[wpn_child]` writes no `$scheme`; it gets one, and the fields it does not restate, from
    // `[wpn_base]`. Its absence from the findings is the assertion, so it is named explicitly.
    expect(said).not.toContain("[wpn_child]");
  });

  it("should name the value a typed field refused", () => {
    expect(said).toContain("[wpn_broken] cost : Invalid value, unsigned 32 bit number is expected, got 'expensive'");
    expect(said).toContain(
      "[wpn_broken] kind : Invalid value, one of possible values [pistol,rifle,shotgun] expected, got 'launcher'"
    );
  });

  it("should hold a strict section to both halves of its declaration", () => {
    expect(said).toContain("[wpn_broken] unexpected_field : Unexpected field, definition is required in strict mode");
    expect(said).toContain("[wpn_incomplete] ammo_class : Required field was not provided");
  });

  it("should report a section asking for a scheme nothing declares", () => {
    expect(said).toContain("[wpn_undeclared_scheme] * : Required schema '$no_such_scheme' definition is not found");
  });

  it("should judge a section against a `*` declaration when the scheme has one", () => {
    // `[wpn_child_upgrades]` names arbitrary keys and every one of them is typed by `* = u32`, so the
    // proof it was judged is the field count above rather than a finding.
    expect(said).not.toContain("[wpn_child_upgrades]");
  });

  it("should name the file a finding was raised in", () => {
    expect(said).toContain("in '<resources>/ltx-schemes/configs/standalone.ltx' [ammo_9x18]");
  });

  /**
   * A finding inside an included file is reported at the entry point that included it.
   *
   * @remarks
   * `[wpn_broken]` is written in `configs/items/w_broken.ltx`, and every finding it raises names
   * `configs/system.ltx`. Verification reads one resolved document per entry point and the section
   * carries no record of the file it came from, so the location is the only one the verifier has.
   * Recorded because it is what a caller has to act on today, not because it is the useful answer.
   */
  it("should report a finding from an included file at the entry point", () => {
    expect(said).toContain("in '<resources>/ltx-schemes/configs/system.ltx' [wpn_broken]");
    expect(said).not.toContain("w_broken.ltx");
  });

  it("should name each checked field when asked to be verbose", () => {
    expect(verbose.stdout).toContain("Checking <resources>/ltx-schemes/configs/standalone.ltx [ammo_9x18] box_size");
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
