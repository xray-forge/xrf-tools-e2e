import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import type { Optional } from "#/types";
import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * The set totals, which is what a run answers with whether it packed one archive or five.
 */
interface IPackSetResult {
  targets: Array<{ name: string; result: IPackResult }>;
  filesTotal: number;
  filesSkipped: number;
  filesCompressed: number;
  filesStored: number;
  filesAliased: number;
  unclaimed: number;
  speed: number;
  duration: number;
}

/**
 * One target of the set, which is where the phases of a single archive are reported.
 */
interface IPackResult {
  duration: number;
  collectDuration: number;
  writeDuration: number;
  finalizeDuration: number;
}

/**
 * What a pack says about each decision.
 *
 * Normal output is the compact summary. Verbose output adds one line per directory, excluded directory, skipped file,
 * placed entry, and volume, in an order that depends on names rather than on the filesystem, and never changes what is
 * written.
 */
describe("archive pack verbose output", () => {
  const box = new Sandbox(__filename);

  const selection: Array<string> = [
    "--exclude-extension",
    "*.md",
    "--exclude-directory",
    "misc",
    "--exclude-directory-shallow",
    "text",
  ];

  let plain: CliResult;
  let reported: CliResult;
  let verbose: CliResult;

  beforeAll(() => {
    const source: string = box.copyIn(gamedata("configs"), "source");

    // One file for each decision the packer can make beyond compressing and storing what the fixture already holds:
    // readme.txt is on the built-in skip list, notes.md is dropped by the configured extension, system_copy.ltx
    // shares the payload of system.ltx, empty.ltx has nothing to compress, and tiny.ltx compresses to no gain.
    box.write("source/readme.txt", "leftover\n");
    box.write("source/notes.md", "# notes\n");
    fs.copyFileSync(gamedata("configs/system.ltx"), box.at("source/system_copy.ltx"));
    box.write("source/empty.ltx", "");
    box.write("source/tiny.ltx", "[a]\n");

    plain = box.run("archive pack", [source, "--dest", box.at("plain"), "--name", "a", ...selection]);

    reported = box.run("archive pack", [
      source,
      "--dest",
      box.at("reported"),
      "--name",
      "a",
      ...selection,
      "--report",
      box.at("reported.json"),
    ]);

    verbose = box.run("archive pack", [source, "--dest", box.at("verbose"), "--name", "a", ...selection, "--verbose"]);
  });

  it("should keep the normal summary compact", () => {
    expect(plain).toMatchSnapshot();
  });

  // Each run names its own destination, which is the one line allowed to differ.
  it("should say the same in normal mode whether or not a report is written", () => {
    const withoutPaths = (result: CliResult): Array<string> =>
      result.stdout.filter((line) => !line.includes("<sandbox>"));

    expect(withoutPaths(reported)).toEqual(withoutPaths(plain));
  });

  it("should add one deterministic line per decision in verbose mode", () => {
    expect(verbose).toMatchSnapshot();
  });

  it("should name the alias source on its line", () => {
    expect(verbose.stdout).toContain("Aliased: system_copy.ltx -> system.ltx");
  });

  it("should name the same totals on the terminal as in the report", () => {
    const result: IPackSetResult = envelopeAt(box.at("reported.json")).result as IPackSetResult;

    expect(verbose.stdout).toContain(
      `Summary: ${result.filesCompressed} compressed, ${result.filesStored} stored, ${result.filesAliased} aliased, ` +
        `${result.filesSkipped} skipped, ${result.unclaimed} unclaimed`
    );
    expect(verbose.stdout).toContain("Speed: <speed>");
    expect(result.speed).toBeGreaterThan(0);
  });

  // The phases belong to one archive, so they are reported on the target rather than on the set: what a set spends
  // deciding it may write at all belongs to none of its targets.
  it("should divide the reported duration between the reported phases", () => {
    const set: IPackSetResult = envelopeAt(box.at("reported.json")).result as IPackSetResult;
    const target: Optional<IPackSetResult["targets"][number]> = set.targets[0];

    if (target === undefined) {
      throw new Error("The run reported no target.");
    }

    const result: IPackResult = target.result;
    const phases: number = result.collectDuration + result.writeDuration + result.finalizeDuration;

    expect(set.targets).toHaveLength(1);
    expect(phases).toBeLessThanOrEqual(result.duration);
    expect(phases).toBeGreaterThanOrEqual(result.duration - 2);
  });

  // Saying more may not change what is written.
  it("should write identical archives with and without verbose output or a report", () => {
    expect(box.sha("reported/a.db")).toBe(box.sha("plain/a.db"));
    expect(box.sha("verbose/a.db")).toBe(box.sha("plain/a.db"));
  });

  // Recorded as a document rather than only as the manifest's hash of one: the payload is what the engine build reads
  // back, so a renamed or dropped member has to reach the diff as its own line instead of as a moved digest.
  it("should report the run as a readable document", () => {
    expect(box.json("reported.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["reported.json"] })).toMatchSnapshot();
  });
});
