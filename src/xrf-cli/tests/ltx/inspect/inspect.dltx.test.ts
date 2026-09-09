import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedataDltx } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What `ltx inspect --dltx` says about a value a patch file won.
 *
 * @remarks
 * The case the command exists for. In a patched install the resolved value is the only thing a
 * modder can see, and it is written in a file whose name the config never mentions; two mod files
 * contest `[wpn_ak74]` here and the alphabetically last one wins, which is the rule nothing else
 * reports.
 */
describe("ltx inspect dltx", () => {
  const box = new Sandbox(__filename);

  let inspect: CliResult;
  let said: string;

  beforeAll(() => {
    inspect = box.run("ltx inspect", ["--path", gamedataDltx("configs"), "--dltx", "wpn_ak74"]);
    said = [...inspect.stdout, ...inspect.stderr].join("\n");
  });

  it("should explain every field the dialect resolved", () => {
    expect(inspect).toMatchSnapshot();
  });

  it("should name the mod file that won a contested field, and its load rank", () => {
    // `mod_system_aaa.ltx` also writes `cost`, and loses: depth decreases as the list advances, so
    // the alphabetically last file outranks it.
    expect(said).toContain("cost");
    expect(said).toContain("set by mod_system_xxx.ltx (depth -400)");
  });

  it("should keep the authored operation of a list edit", () => {
    // Resolving rewrites the winning item to a plain assignment, because by then it holds the merged
    // list. Reporting that would send a person looking for `ammo_class =` in a file that writes
    // `>ammo_class =`.
    expect(said).toContain("set by mod_system_aaa.ltx ('>', depth -200)");
  });

  it("should report a field only the patch file supplies", () => {
    expect(said).toContain("patched_by");
  });

  it("should not report a field the patch file deleted", () => {
    // `mod_system_xxx.ltx` writes `!rpm`, so the base value is gone rather than overridden.
    expect(said).not.toContain("rpm ");
  });

  it("should name the file that declares the section, not the entry point that resolved it", () => {
    expect(said).toContain("[wpn_ak74] resolved from system.ltx (dltx)");
    expect(said).toContain("declared in items\\w_ak74.ltx");
  });

  it("should refuse the same tree under standard rules rather than half-resolving it", () => {
    // Without the flag the patch files are entry points of their own, and standard LTX has no
    // operation prefixes, so it refuses them rather than reading `![wpn_ak74]` as a section name.
    const standard: CliResult = box.run(
      "ltx inspect",
      ["--path", gamedataDltx("configs"), "wpn_ak74", "--entry", "mod_system_xxx.ltx"],
      { expectExit: 1 }
    );

    // The refusal names the statement and the flag, rather than reading `![wpn_ak74]` as a section
    // whose name begins with an exclamation mark and reporting a section nothing else declares.
    expect([...standard.stdout, ...standard.stderr].join("\n")).toContain(
      "which needs the dltx dialect; rerun with --dltx"
    );
  });

  it("should deposit the same explanation through a report", () => {
    box.run("ltx inspect", [
      "--path",
      gamedataDltx("configs"),
      "--dltx",
      "wpn_ak74",
      "--silent",
      "--report",
      box.at("report.json"),
    ]);

    expect(box.json("report.json")).toMatchSnapshot();
  });
});
