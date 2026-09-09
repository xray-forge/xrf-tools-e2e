import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { EDITED_SYSTEM_LTX, createWorld } from "#/xrf-cli/test/patch-worlds";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack-patch refusals", () => {
  const box = new Sandbox(__filename);

  let base: string;
  let target: string;
  let insideRoot: CliResult;
  let emptyScope: CliResult;
  let emptyBase: CliResult;
  let occupied: CliResult;

  beforeAll(() => {
    base = createWorld(box, "base");
    target = createWorld(box, "target", [
      { content: EDITED_SYSTEM_LTX, path: "configs/system.ltx" },
      { content: null, path: "configs/fonts.ltx" },
    ]);

    insideRoot = box.run("archive pack-patch", [base, "--target", target, "--dest", box.at("base/patches")], {
      expectExit: 1,
    });

    emptyScope = box.run(
      "archive pack-patch",
      [base, "--target", target, "--dest", box.at("empty-scope"), "--dry-run", "--include", "renamed"],
      { expectExit: 1 }
    );

    fs.mkdirSync(box.at("hollow"), { recursive: true });

    emptyBase = box.run(
      "archive pack-patch",
      [box.at("hollow"), "--target", target, "--dest", box.at("empty-base"), "--dry-run"],
      { expectExit: 1 }
    );

    box.run("archive pack-patch", [
      base,
      "--target",
      target,
      "--dest",
      box.at("occupied"),
      "--name",
      "patch",
      "--silent",
    ]);

    occupied = box.run(
      "archive pack-patch",
      [base, "--target", target, "--dest", box.at("occupied"), "--name", "patch"],
      { expectExit: 1 }
    );
  });

  it("should refuse a destination inside a compared root", () => {
    // `db/patches/` is both where a patch belongs and a directory someone would name as a base root,
    // so a patch written there would become an input to the next run over the same pair.
    expect(insideRoot).toMatchSnapshot();
  });

  it("should refuse a scope that matches nothing", () => {
    // Otherwise a renamed directory makes a release gate pass while comparing nothing at all.
    expect(emptyScope).toMatchSnapshot();
  });

  it("should refuse a side that holds no entry", () => {
    // Every entry of the other side would become a difference, which is not a comparison.
    expect(emptyBase).toMatchSnapshot();
  });

  it("should refuse a destination already holding the set", () => {
    expect(occupied).toMatchSnapshot();
  });

  it("should replace an existing set when forced", () => {
    expect(
      box.run("archive pack-patch", [
        base,
        "--target",
        target,
        "--dest",
        box.at("occupied"),
        "--name",
        "patch",
        "--force",
        "--silent",
      ]).exitCode
    ).toBe(0);
  });
});
