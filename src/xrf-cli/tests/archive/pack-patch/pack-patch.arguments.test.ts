import { beforeAll, describe, expect, it } from "@jest/globals";

import { EDITED_SYSTEM_LTX, createWorld } from "#/xrf-cli/test/patch-worlds";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack-patch arguments", () => {
  const box = new Sandbox(__filename);

  let base: string;
  let target: string;
  let withoutBase: CliResult;
  let withoutTarget: CliResult;
  let malformedHeader: CliResult;
  let conflictingReports: CliResult;
  let oversized: CliResult;

  beforeAll(() => {
    base = createWorld(box, "base");
    target = createWorld(box, "target", [{ content: EDITED_SYSTEM_LTX, path: "configs/system.ltx" }]);

    // A comparison needs two worlds, so neither side has a default to fall back on.
    withoutBase = box.run("archive pack-patch", ["--target", target, "--dest", box.at("out")], {
      expectExit: 2,
    });
    withoutTarget = box.run("archive pack-patch", ["--base", base, "--dest", box.at("out")], {
      expectExit: 2,
    });

    malformedHeader = box.run(
      "archive pack-patch",
      ["--base", base, "--target", target, "--dest", box.at("out"), "--header", "auto_load"],
      { expectExit: 1 }
    );

    conflictingReports = box.run(
      "archive pack-patch",
      ["--base", base, "--target", target, "--dest", box.at("out"), "--json", "--report", box.at("both.json")],
      { expectExit: 2 }
    );

    oversized = box.run(
      "archive pack-patch",
      ["--base", base, "--target", target, "--dest", box.at("out"), "--max-size", "4000"],
      { expectExit: 1 }
    );
  });

  it("should require a base root", () => {
    expect(withoutBase).toMatchSnapshot();
  });

  it("should require a target root", () => {
    expect(withoutTarget).toMatchSnapshot();
  });

  it("should refuse a header entry that names no key", () => {
    expect(malformedHeader).toMatchSnapshot();
  });

  it("should refuse both report destinations at once", () => {
    expect(conflictingReports).toMatchSnapshot();
  });

  it("should refuse a volume size past what the engine mounts", () => {
    // Named here as well as inside the crate so the refusal can point at the flag that lifts it.
    expect(oversized).toMatchSnapshot();
  });

  it("should publish oversized volumes when asked", () => {
    expect(
      box.run("archive pack-patch", [
        "--base",
        base,
        "--target",
        target,
        "--dest",
        box.at("oversized"),
        "--max-size",
        "4000",
        "--oversized-volumes",
        "--silent",
      ]).exitCode
    ).toBe(0);
  });
});
