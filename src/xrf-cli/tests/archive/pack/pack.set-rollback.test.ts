import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * The set the second target of always fails.
 *
 * `configs` packs cleanly and `particles` cannot: one file of 1.13 MB needs a volume to itself, and the target caps a
 * volume at one megabyte, which is the smallest size this dialect can spell. The failure therefore lands after the
 * first target is finished and published, which is the only shape that can tell rollback from "it stopped early".
 */
const ROLLBACK_SET: Array<string> = [
  "[include_folders.configs]",
  "configs = true",
  "",
  "[options.particles]",
  "max_volume_size = 1",
  "",
  "[include_files.particles]",
  "particles.xr",
  "",
  "[include_folders.particles]",
  "",
];

/**
 * A set is all-or-nothing, unless it had already replaced something.
 *
 * An unforced run takes back every volume it wrote, finished targets included, because a destination that is half one
 * build and half another is worse than one that never changed. A forced run over a destination that already held one
 * of the set's archives cannot tell its own output from what it replaced, so it answers with what it opened and leaves
 * the destination as it stands. The rule is keyed on what the destination held rather than on the flag.
 */
describe("archive pack set rollback", () => {
  const box = new Sandbox(__filename);

  let rolledBack: CliResult;
  let published: CliResult;
  let forced: CliResult;

  let publishedBefore: string;

  beforeAll(() => {
    const config: string = box.write("rollback.ltx", ROLLBACK_SET.join("\n"));

    rolledBack = box.run("archive pack", [gamedata(), "--dest", box.at("clean"), "--config", config], {
      expectExit: 1,
    });

    // The same first target alone, so the second run has something of its own set to replace.
    published = box.run("archive pack", [
      gamedata(),
      "--dest",
      box.at("published"),
      "--config",
      config,
      "--target",
      "configs",
    ]);
    publishedBefore = box.sha("published/configs.db");

    forced = box.run("archive pack", [gamedata(), "--dest", box.at("published"), "--config", config, "--force"], {
      expectExit: 1,
    });
  });

  it("should take back a finished target when a later one fails", () => {
    expect(rolledBack).toMatchSnapshot();
    expect(rolledBack.stderr.join("\n")).toContain("particles.xr");
    expect(fs.existsSync(box.at("clean/configs.db"))).toBe(false);
  });

  it("should publish the first target on its own", () => {
    expect(published).toMatchSnapshot();
  });

  // Forced over volumes that were already there, the run has nothing to restore them from and says so by leaving them.
  it("should leave an archive it replaced when a later target fails", () => {
    expect(forced).toMatchSnapshot();
    expect(fs.existsSync(box.at("published/configs.db"))).toBe(true);
    expect(box.sha("published/configs.db")).toBe(publishedBefore);
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
