import { beforeAll, describe, expect, it } from "@jest/globals";

import { ltxSchemes } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What `ltx inspect` says about a resolved section under standard LTX.
 *
 * @remarks
 * The question this command exists to answer is not what a value is - `ltx verify` reads the same
 * tree - but where it is written, which is the one thing a resolved config cannot say for itself.
 * `ltx-schemes` is the fixture for it because `[wpn_child]` and `[wpn_base]` sit in the same file,
 * so an inherited field and a written one differ by their section and not by their path.
 */
describe("ltx inspect", () => {
  const box = new Sandbox(__filename);

  let child: CliResult;
  let said: string;

  beforeAll(() => {
    child = box.run("ltx inspect", ["--path", ltxSchemes("configs"), "wpn_child"]);
    said = [...child.stdout, ...child.stderr].join("\n");
  });

  it("should explain every field of the section", () => {
    expect(child).toMatchSnapshot();
  });

  it("should name the section a field was inherited from, not the file", () => {
    // `$scheme` is the one field `[wpn_child]` does not restate. Both sections are written in
    // `items\w_base.ltx`, so naming only a file would leave this indistinguishable from a field the
    // child writes itself - which is why the record carries the section.
    expect(said).toContain("inherited from [wpn_base]");
  });

  it("should say a field the section writes is written there", () => {
    expect(said).toContain("written here");
  });

  it("should report which entry point resolved the section and which file declared it", () => {
    expect(said).toContain("[wpn_child] resolved from system.ltx (ltx)");
    expect(said).toContain("declared in items\\w_base.ltx");
  });

  it("should report the parents the header declared, which resolving flattens away", () => {
    expect(said).toContain("inherits wpn_base");
  });

  it("should refuse a section no entry point declares", () => {
    const missing: CliResult = box.run("ltx inspect", ["--path", ltxSchemes("configs"), "wpn_nothing"], {
      expectExit: 1,
    });

    expect([...missing.stdout, ...missing.stderr].join("\n")).toContain(
      "No entry point of this project declares section '[wpn_nothing]'"
    );
  });

  it("should deposit the same explanation through a report", () => {
    box.run("ltx inspect", [
      "--path",
      ltxSchemes("configs"),
      "wpn_child",
      "--silent",
      "--report",
      box.at("report.json"),
    ]);

    expect(box.json("report.json")).toMatchSnapshot();
  });
});
