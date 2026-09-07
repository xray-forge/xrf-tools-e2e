import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * The command's own shape, which changed without a compatibility period.
 *
 * The source is a positional and the two boolean switches that used to name a mode and an extension are gone, because
 * a configuration file may now say `mode = store` or `extension = xdb` and a one-way flag cannot override one back.
 * Everything here is what clap can answer before the command runs, so every refusal is a usage error rather than a
 * run that started and stopped.
 */
describe("archive pack signature", () => {
  const box = new Sandbox(__filename);

  let legacyPath: CliResult;
  let missingSource: CliResult;
  let legacyStore: CliResult;
  let legacyExtension: CliResult;
  let unknownMode: CliResult;
  let help: CliResult;

  beforeAll(() => {
    // The removed spelling is an unknown argument now, not a second way in: no alias, no deprecation.
    legacyPath = box.run("archive pack", ["--path", gamedata("configs"), "--dest", box.at("legacy"), "--name", "cfg"], {
      expectExit: 2,
    });
    missingSource = box.run("archive pack", ["--dest", box.at("missing"), "--name", "cfg"], { expectExit: 2 });
    legacyStore = box.run("archive pack", [gamedata("configs"), "--dest", box.at("store"), "--store"], {
      expectExit: 2,
    });
    legacyExtension = box.run("archive pack", [gamedata("configs"), "--dest", box.at("xdb"), "--xdb"], {
      expectExit: 2,
    });
    // The replacement takes a value from a closed set, so a misspelt one is answered by the parser too.
    unknownMode = box.run("archive pack", [gamedata("configs"), "--dest", box.at("mode"), "--mode", "squish"], {
      expectExit: 2,
    });
    help = box.run("archive pack", ["--help"]);
  });

  it("should refuse the removed source option", () => {
    expect(legacyPath).toMatchSnapshot();
  });

  it("should refuse a run that names no source", () => {
    expect(missingSource).toMatchSnapshot();
    expect(missingSource.stderr.join("\n")).toContain("<SOURCE>");
  });

  it("should refuse the removed mode and extension switches", () => {
    expect(legacyStore).toMatchSnapshot();
    expect(legacyExtension).toMatchSnapshot();
  });

  it("should refuse a mode that names no packing mode", () => {
    expect(unknownMode).toMatchSnapshot();
  });

  it("should document the positional source in its usage", () => {
    expect(help).toMatchSnapshot();
    expect(help.stdout.join("\n")).toContain("archive pack [OPTIONS] <SOURCE>");
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
