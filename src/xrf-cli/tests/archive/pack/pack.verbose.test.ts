import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * The pack result, as far as this suite reads it back.
 */
interface IPackResult {
  filesTotal: number;
  filesSkipped: number;
  filesCompressed: number;
  filesStored: number;
  filesAliased: number;
  speed: number;
}

/**
 * Bytes a one megabyte volume cannot hold, as a stored payload that compression never touches.
 */
const OVERSIZED_PAYLOAD_BYTES = 1_536 * 1_024;

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
  let failing: CliResult;

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

    plain = box.run("archive pack", ["--path", source, "--dest", box.at("plain"), "--name", "a", ...selection]);

    reported = box.run("archive pack", [
      "--path",
      source,
      "--dest",
      box.at("reported"),
      "--name",
      "a",
      ...selection,
      "--report",
      box.at("reported.json"),
    ]);

    verbose = box.run("archive pack", [
      "--path",
      source,
      "--dest",
      box.at("verbose"),
      "--name",
      "a",
      ...selection,
      "--verbose",
    ]);

    // A stored payload no volume of the requested size can hold, named so it sorts after every other entry: the
    // refusal then comes after the volume was opened and every other file was placed, which is what a log of a
    // failed run has to show.
    const failingSource: string = box.copyIn(source, "failing-source");

    fs.writeFileSync(box.at("failing-source/zz_big.bin"), Buffer.alloc(OVERSIZED_PAYLOAD_BYTES, 0x5a));

    failing = box.run(
      "archive pack",
      [
        "--path",
        failingSource,
        "--dest",
        box.at("failing"),
        "--name",
        "a",
        ...selection,
        "--max-size",
        "1",
        "--verbose",
      ],
      { expectExit: 1 }
    );
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
    const result: IPackResult = envelopeAt(box.at("reported.json")).result as IPackResult;

    expect(verbose.stdout).toContain(
      `Summary: ${result.filesCompressed} compressed, ${result.filesStored} stored, ${result.filesAliased} aliased, ` +
        `${result.filesSkipped} skipped`
    );
    expect(verbose.stdout).toContain("Speed: <speed>");
    expect(result.speed).toBeGreaterThan(0);
  });

  // Saying more may not change what is written.
  it("should write identical archives with and without verbose output or a report", () => {
    expect(box.sha("reported/a.db")).toBe(box.sha("plain/a.db"));
    expect(box.sha("verbose/a.db")).toBe(box.sha("plain/a.db"));
  });

  // A run that stops inside a volume has already named the volume and every entry it placed, so the log says where it
  // got to without any file surviving to inspect: the unforced run takes back what it wrote.
  it("should leave a log naming the opened volume and the last entry before a failure", () => {
    expect(failing).toMatchSnapshot();
    expect(failing.stdout).toContain("Opened volume: a.db0");
    expect(failing.stderr.join("\n")).toMatch(/zz_big\.bin/);
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["reported.json"] })).toMatchSnapshot();
  });
});
