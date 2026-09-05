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

  /**
   * A finding inside an included file names that file, and the entry point that resolved it.
   *
   * @remarks
   * `[wpn_broken]` is written in `configs/items/w_broken.ltx` and reached only through
   * `#include "items\w_*.ltx"`. Naming only `configs/system.ltx` sent a modder to a file that
   * declares none of it, which on a vanilla tree is almost every section in the game.
   * Both are reported: the declaring file is what to open, the entry point is the
   * unit a caller re-runs and the only thing saying why two files were read together.
   */
  it("should name the file that declared an included section, and the entry point that resolved it", () => {
    expect(said).toContain(
      "in '<resources>/ltx-schemes/configs/items/w_broken.ltx' resolved from '<resources>/ltx-schemes/configs/system.ltx' [wpn_broken]"
    );
  });

  /**
   * A section written in the entry point itself reads as it always did.
   *
   * @remarks
   * `standalone.ltx` is included by nothing, so the file that declares `[ammo_9x18]` and the entry
   * point that resolved it are one file. Saying so twice would be noise, so the location collapses
   * to a single path and the wording is unchanged for the common case.
   */
  it("should name one path when the declaring file is the entry point", () => {
    expect(said).toContain("in '<resources>/ltx-schemes/configs/standalone.ltx' [ammo_9x18]");
    expect(said).not.toContain("standalone.ltx' resolved from");
  });

  it("should name each checked field when asked to be verbose", () => {
    expect(verbose.stdout).toContain("Checking <resources>/ltx-schemes/configs/standalone.ltx [ammo_9x18] box_size");
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
