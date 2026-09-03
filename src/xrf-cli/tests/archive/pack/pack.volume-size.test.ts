import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Megabytes past the 1900 MB cap the engine mounts, and past the hard bound nothing lifts.
 */
const OVERSIZED_MEGABYTES = 2_000;
const MISTYPED_MEGABYTES = 40_000;

/**
 * The bounds on a volume size, which is the one number a caller may push past what the engine can open.
 *
 * A size outside the range is refused rather than clamped: xrCompress warns and quietly packs 1900 MB volumes
 * instead, and a set split at a size nobody asked for is worse than a run that stops and says so.
 */
describe("archive pack volume size", () => {
  const box = new Sandbox(__filename);

  let refusedTooSmall: CliResult;
  let refusedOversized: CliResult;
  let allowedOversized: CliResult;
  let refusedMistyped: CliResult;

  beforeAll(() => {
    // Below one megabyte is not expressible in the unit the flag takes, so clap answers it as a usage error before
    // the configuration is built at all.
    refusedTooSmall = box.run(
      "archive pack",
      ["--path", gamedata("configs"), "--dest", box.at("too-small"), "--name", "cfg", "--max-size", "0"],
      { expectExit: 2 }
    );

    refusedOversized = box.run(
      "archive pack",
      [
        "--path",
        gamedata("configs"),
        "--dest",
        box.at("refused"),
        "--name",
        "cfg",
        "--max-size",
        String(OVERSIZED_MEGABYTES),
      ],
      { expectExit: 1 }
    );

    // The same size, allowed. The archive is well-formed; what it is not is loadable by any shipped engine, which is
    // what the flag's name and the warning both say.
    allowedOversized = box.run("archive pack", [
      "--path",
      gamedata("configs"),
      "--dest",
      box.at("allowed"),
      "--name",
      "cfg",
      "--max-size",
      String(OVERSIZED_MEGABYTES),
      "--oversized-volumes",
    ]);

    // A stray digit is not a fork: the flag lifts the engine's limit and not the guard against a mistyped number.
    refusedMistyped = box.run(
      "archive pack",
      [
        "--path",
        gamedata("configs"),
        "--dest",
        box.at("mistyped"),
        "--name",
        "cfg",
        "--max-size",
        String(MISTYPED_MEGABYTES),
        "--oversized-volumes",
      ],
      { expectExit: 1 }
    );
  });

  it("should reject a size below the unit it is entered in", () => {
    expect(refusedTooSmall).toMatchSnapshot();
  });

  it("should refuse a cap past what the engine mounts", () => {
    expect(refusedOversized).toMatchSnapshot();
    expect(refusedOversized.stderr.join("\n")).toContain("--oversized-volumes");
  });

  it("should pack past that cap when the flag lifts it", () => {
    expect(allowedOversized).toMatchSnapshot();
    expect(allowedOversized.stderr.join("\n")).toContain("XRP_MAX_SIZE");
  });

  it("should refuse a mistyped cap even with the flag", () => {
    expect(refusedMistyped).toMatchSnapshot();
    expect(refusedMistyped.stderr.join("\n")).toContain("stray digit");
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
