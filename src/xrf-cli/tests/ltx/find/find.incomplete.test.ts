import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What `ltx find` answers when a config of the tree does not parse.
 *
 * @remarks
 * The config that fails may hold the section asked for, so "found nothing" is no answer a script can read by exit
 * code: the search still lists what it found and what it could not read, and the run fails.
 */
describe("ltx find over a config that does not parse", () => {
  const box = new Sandbox(__filename);

  let search: CliResult;

  beforeAll(() => {
    box.write("configs/system.ltx", "[weapon]\ncost = 100\n");
    // A header never closed.
    box.write("configs/broken.ltx", "[wpn_broken\ncost = 200\n");

    search = box.run("ltx find", ["--path", box.at("configs"), "--field", "cost", "--report", box.at("report.json")], {
      expectExit: 1,
    });
  });

  it("should fail the run, naming the config it could not search", () => {
    const said: string = [...search.stdout, ...search.stderr].join("\n");

    expect(search.exitCode).toBe(1);
    expect(said).toContain("Not searched,");
    expect(said).toContain("broken.ltx");
    expect(said).toContain("The search is incomplete: 1 config(s) do not parse");
  });

  it("should still deposit what it found and what it could not read", () => {
    const result = envelopeAt(box.at("report.json")).result as {
      declarations: Array<{ path: string }>;
      unreadable: Array<{ path: string }>;
    };

    expect(result.declarations.map((it) => it.path)).toEqual(["system.ltx"]);
    expect(result.unreadable.map((it) => it.path)).toEqual(["broken.ltx"]);
  });
});
