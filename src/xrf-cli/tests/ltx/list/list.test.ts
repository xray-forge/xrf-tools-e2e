import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedataDltx, ltxSchemes } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What `ltx list` says a project contains.
 *
 * @remarks
 * The inventory a person needs before they can ask anything else: which configs resolve on their
 * own, which are pulled in by another, which declare schemes, and which patch something. The same
 * tree answers differently under each dialect, and that difference is the point of the suite.
 */
describe("ltx list", () => {
  const box = new Sandbox(__filename);

  let listed: CliResult;
  let said: string;

  beforeAll(() => {
    listed = box.run("ltx list", ["--path", ltxSchemes("configs")]);
    said = [...listed.stdout, ...listed.stderr].join("\n");
  });

  it("should list every config with the role it plays", () => {
    expect(listed).toMatchSnapshot();
  });

  it("should name the config that includes an included one", () => {
    expect(said).toContain("items\\w_broken.ltx - included by system.ltx");
  });

  it("should separate a scheme declaration from a config it governs", () => {
    expect(said).toContain("weapons.scheme.ltx - scheme");
  });

  it("should report a config nothing includes as an entry point", () => {
    expect(said).toContain("standalone.ltx - entry point");
  });

  it("should read a patch file as an attachment only under the dialect that has them", () => {
    const dltx: CliResult = box.run("ltx list", ["--path", gamedataDltx("configs"), "--dltx"]);
    const standard: CliResult = box.run("ltx list", ["--path", gamedataDltx("configs")]);

    // The same six files either way. What changes is what they are to the project: standard LTX has
    // no notion of one config patching another, so a `mod_*.ltx` stands on its own and would be
    // verified as though it did.
    expect(dltx.stdout.join("\n")).toContain("mod_system_xxx.ltx - attachment");
    expect(standard.stdout.join("\n")).toContain("mod_system_xxx.ltx - entry point");
  });

  it("should deposit the same inventory through a report", () => {
    box.run("ltx list", ["--path", ltxSchemes("configs"), "--silent", "--report", box.at("report.json")]);

    expect(box.json("report.json")).toMatchSnapshot();
  });
});
