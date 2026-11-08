import { beforeAll, describe, expect, it } from "@jest/globals";

import type { Nullable } from "#/types";
import { gamedataDltx } from "#/xrf-cli/test/constants";
import { type CommandEnvelope, envelopeOf } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const FSGAME = [
  "$arch_dir$              = false| false| $fs_root$| database\\",
  "$game_data$             = true|  true|  $fs_root$| gamedata\\",
  "",
].join("\n");

/** One declaration as the report records it, narrowed to what these assertions read. */
interface FoundDeclaration {
  path: string;
  line: number;
  source: string;
  isPatch: boolean;
  isPhysical: boolean;
  kind: "section" | "field";
  operation?: string;
  sectionOperation: string;
  value?: Nullable<string>;
}

/**
 * What `ltx find` says about where a section or field is written in an installation.
 *
 * @remarks
 * The DLTX tree split the way a modded game ships it: the base weapon configs come out of an
 * archive, the patch files sit loose beside `system.ltx`. A host-filesystem search would never see
 * the declaration, and would report the patches as though they were the section itself.
 */
describe("ltx find", () => {
  const box = new Sandbox(__filename);

  let section: CliResult;
  let field: CliResult;
  let standard: CliResult;
  let piped: CliResult;
  let inspect: CliResult;
  let folded: CliResult;
  let exact: CliResult;

  const said = (result: CliResult): string => [...result.stdout, ...result.stderr].join("\n");

  beforeAll(() => {
    // Packed from a staging tree shaped like a gamedata root, so the entries land on the logical
    // paths the loose copies would have used.
    box.copyIn(gamedataDltx("configs/items"), "stage/configs/items");
    box.run("archive pack", ["--path", box.at("stage"), "--dest", box.at("install/database"), "--name", "gamedata"]);

    for (const name of ["system.ltx", "weapons.scheme.ltx", "mod_system_aaa.ltx", "mod_system_xxx.ltx"]) {
      box.copyIn(gamedataDltx(`configs/${name}`), `install/gamedata/configs/${name}`);
    }

    box.write("install/fsgame.ltx", FSGAME);

    const install: string = box.at("install");

    section = box.run("ltx find", ["--path", install, "--dltx", "--section", "wpn_ak74"]);
    field = box.run("ltx find", ["--path", install, "--dltx", "--section", "wpn_ak74", "--field", "cost"]);
    standard = box.run("ltx find", ["--path", install, "--field", "ammo_class"]);
    piped = box.run("ltx find", ["--path", install, "--dltx", "--section", "wpn_ak74", "--field", "cost", "--json"]);
    box.run("ltx find", [
      "--path",
      install,
      "--dltx",
      "--section",
      "wpn_ak74",
      "--field",
      "cost",
      "--silent",
      "--report",
      box.at("report.json"),
    ]);
    inspect = box.run("ltx inspect", ["--path", install, "--dltx", "wpn_ak74"]);
    folded = box.run("ltx find", ["--path", install, "--dltx", "--section", "WPN_AK74"]);
    exact = box.run("ltx find", ["--path", install, "--section", "WPN_AK74"]);
  });

  it("should compare section names the way the chosen dialect resolves them", () => {
    // DLTX lowercases every section name it reads, so `WPN_AK74` is the section the patches edit.
    // Standard LTX looks a section up as bracketed, so the same query names a section nothing writes.
    expect(said(folded)).toContain("configs\\items\\w_ak74.ltx:1 [wpn_ak74]:wpn_base - declaration [archived]");
    expect(said(folded)).toContain("Found 3 statement(s)");
    expect(said(exact)).toContain("Found 0 statement(s)");
  });

  it("should find a section where it is declared and where it is patched", () => {
    expect(section).toMatchSnapshot();
  });

  it("should find the declaration inside the archive and the patches beside it", () => {
    expect(said(section)).toContain("configs\\items\\w_ak74.ltx:1 [wpn_ak74]:wpn_base - declaration [archived]");
    expect(said(section)).toContain("configs\\mod_system_aaa.ltx:3 ![wpn_ak74] - patch");
    expect(said(section)).toContain("configs\\mod_system_xxx.ltx:3 ![wpn_ak74] - patch");
  });

  it("should name the archive and the loose tree as the sources they are", () => {
    const declarations: Array<FoundDeclaration> = (
      envelopeOf(piped).result as { declarations: Array<FoundDeclaration> }
    ).declarations;

    expect(declarations.map((it) => `${it.path}:${it.line}`)).toEqual([
      "configs\\items\\w_ak74.ltx:3",
      "configs\\mod_system_aaa.ltx:4",
      "configs\\mod_system_xxx.ltx:4",
    ]);
    expect(declarations[0]).toMatchObject({ isPatch: false, isPhysical: false, kind: "field", sectionOperation: "" });
    expect(declarations[1]).toMatchObject({ isPatch: true, isPhysical: true, kind: "field", sectionOperation: "!" });
    expect(declarations[0]?.source).not.toEqual(declarations[1]?.source);
  });

  it("should keep the operation a patch statement was written with", () => {
    // A plain assignment under `![wpn_ak74]` patches as surely as `>ammo_class` does, and both are
    // reported with the prefixes the file actually carries, header and line alike.
    expect(said(field)).toContain("configs\\mod_system_xxx.ltx:4 ![wpn_ak74] cost = 9000 - patch");
    expect(said(standard)).toContain("configs\\mod_system_aaa.ltx:5 ![wpn_ak74] >ammo_class = ammo_c - patch");
  });

  it("should report every written value and leave the winner to ltx inspect", () => {
    // Three files write `cost`, and find reports all three as written. Only inspect says which one
    // the game reads; a textual match is never presented as the resolved value.
    const values = (envelopeOf(piped).result as { declarations: Array<FoundDeclaration> }).declarations.map(
      (it) => it.value
    );

    expect(values).toEqual(["4000", "5000", "9000"]);
    expect(said(field)).not.toContain("set by");
    expect(said(field)).toContain("Resolved values: ltx inspect --path");
    expect(said(inspect)).toContain("set by mod_system_xxx.ltx (depth -400)");
  });

  it("should warn that standard LTX refuses the patch statements it found", () => {
    expect(said(standard)).toContain("written as DLTX patches, which standard LTX refuses; rerun with --dltx");
  });

  it("should deposit the same records through --json and a report", () => {
    // Both normalized, since stdout is: the sources are absolute sandbox paths either way.
    const report = box.json("report.json") as CommandEnvelope;

    expect(report.result).toEqual(envelopeOf(piped).result);
    expect(report).toMatchSnapshot();
  });

  it("should write only the archive it packed and the report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
