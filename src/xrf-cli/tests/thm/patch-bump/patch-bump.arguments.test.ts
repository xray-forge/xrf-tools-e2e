import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("textures/act_cat_bump.thm");

describe("thm patch-bump arguments", () => {
  const box = new Sandbox(__filename);

  let neither: CliResult;
  let both: CliResult;
  let inputBefore: string;

  beforeAll(() => {
    const input = box.copyIn(SOURCE, "input.thm");

    inputBefore = box.sha("input.thm");
    neither = box.run("thm patch-bump", ["--path", input, "--report", box.at("neither.json")], { expectExit: 1 });
    both = box.run(
      "thm patch-bump",
      ["--path", input, "--to", "wpn\\wpn_pm\\wpn_pm_bump", "--off", "--report", box.at("both.json")],
      { expectExit: 2 }
    );
  });

  it("should reject neither assignment nor disable during execution with an envelope", () => {
    expect(neither).toMatchSnapshot();
    expect(box.json("neither.json")).toMatchSnapshot();
    expect(box.json("neither.json")).toMatchObject({ exitCode: 1, outcome: "executionFailed", result: null });
  });

  it("should reject both options during argument parsing before a report exists", () => {
    expect(both).toMatchSnapshot();
    expect(fs.existsSync(box.at("both.json"))).toBe(false);
  });

  it("should leave the input unchanged for both refusals", () => {
    expect(box.sha("input.thm")).toBe(inputBefore);
  });

  it("should write only the input and execution envelope", () => {
    expect(box.manifest({ normalized: ["neither.json"] })).toMatchSnapshot();
  });
});
