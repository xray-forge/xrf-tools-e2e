import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

/**
 * An installation declaring gamedata beside one archive directory.
 */
const FSGAME = [
  ";abbreviation   = recurs| notif | root      | add",
  "$arch_dir$      = false | false | $fs_root$ | db\\",
  "$game_data$     = true  | true  | $fs_root$ | gamedata\\",
  "",
].join("\n");

/**
 * A declared volume that is not one.
 *
 * @remarks
 * The reproduction the issue asks for: a source the planner accepts but mounting cannot open. Mounting tolerates it so
 * one corrupt volume does not cost the run the rest of the installation, which is exactly why the omission has to reach
 * the report — the checks below it then measure only what did mount.
 */
const CORRUPT_VOLUME = "install/db/files.db0";

describe("gamedata verify meets a declared source it cannot open", () => {
  const box = new Sandbox(__filename);

  let verify: CliResult;
  let emptyCheck: CliResult;
  let ignoredSource: CliResult;
  let clean: CliResult;
  let inputs: Array<ManifestFile>;

  beforeAll(() => {
    box.write("install/fsgame.ltx", FSGAME);
    // Formatter-shaped, CRLF included, so the selected check passes and the verdict can only come from lost coverage.
    box.write("install/gamedata/configs/system.ltx", "[section]\r\nvalue = 1\r\n");
    box.write(CORRUPT_VOLUME, "not an archive volume");
    box.write("clean/fsgame.ltx", FSGAME);
    box.write("clean/gamedata/configs/system.ltx", "[section]\r\nvalue = 1\r\n");
    inputs = box.manifest();

    // Deliberately a check that has nothing to do with archives: a narrow selection must not turn an installation whose
    // whole archive set went unread into a passing run.
    verify = box.run("gamedata verify", [box.at("install"), "--checks", "ltx", "--report", box.at("report.json")], {
      expectExit: 1,
    });

    box.run("gamedata verify", [box.at("install"), "--checks", "ltx", "--silent", "--report", box.at("silent.json")], {
      expectExit: 1,
    });
    emptyCheck = box.run(
      "gamedata verify",
      [box.at("install"), "--checks", "scripts", "--report", box.at("empty-check.json")],
      { expectExit: 1 }
    );
    // `db` names the mount directory on disk, not a logical asset prefix. Ignoring it must therefore leave the
    // declared archive source subject to the same open-and-coverage accounting.
    ignoredSource = box.run(
      "gamedata verify",
      [box.at("install"), "--checks", "scripts", "--ignore", "db", "--report", box.at("ignore.json")],
      { expectExit: 1 }
    );
    clean = box.run("gamedata verify", [box.at("clean"), "--checks", "scripts", "--report", box.at("clean.json")]);
  });

  it("should warn which declared source went unread and answer non-zero", () => {
    expect(verify).toMatchSnapshot();
  });

  // Exit 1 rather than 3: the run could not do its whole job, which is the environment's fault and not a verdict on the
  // content. A script telling "fix your data" from "fix your environment" branches on exactly this.
  it("should report the run as an execution failure rather than a check verdict", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

    expect(envelope.outcome).toBe("executionFailed");
    expect(envelope.exitCode).toBe(1);
    expect(envelope.error).toContain("incomplete");
  });

  // Both shapes of the same fact: the coverage check for a person reading findings, and the record for a script that
  // never parses a message.
  it("should carry the lost coverage as its own check and as a stable record", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should retain skipped coverage when the selected check has no input", () => {
    expect(emptyCheck.exitCode).toBe(1);
    expect(box.json("empty-check.json")).toMatchObject({
      exitCode: 1,
      outcome: "executionFailed",
      result: {
        status: "incomplete",
        checks: [
          {
            verificationType: "coverage",
            status: "incomplete",
            findings: [{ ruleId: "coverage.skipped-mount", assetPath: "db" }],
          },
          { verificationType: "collisions", status: "skipped", findings: [] },
          { verificationType: "scripts", status: "passed", findings: [] },
        ],
      },
    });
  });

  it("should retain the unread source when an ignored logical prefix names its mount directory", () => {
    expect(ignoredSource.exitCode).toBe(1);
    expect(box.json("ignore.json")).toMatchObject({
      exitCode: 1,
      outcome: "executionFailed",
      result: {
        status: "incomplete",
        skippedMounts: [{ origin: "$arch_dir$" }],
        checks: [
          {
            verificationType: "coverage",
            status: "incomplete",
            summary: "1 declared source(s) could not be opened, so no result covers them",
            findings: [{ ruleId: "coverage.skipped-mount", assetPath: "db" }],
          },
          {
            verificationType: "collisions",
            status: "skipped",
            summary: "No unreachable files",
            findings: [],
          },
          { verificationType: "scripts", status: "passed", summary: "0/0 scripts valid", findings: [] },
        ],
      },
    });
  });

  it("should pass the empty selection when the installation has no unread mount", () => {
    expect(clean.exitCode).toBe(0);
    expect(box.json("clean.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        status: "passed",
        skippedMounts: [],
        checks: [
          { verificationType: "coverage", status: "skipped", findings: [] },
          { verificationType: "collisions", status: "skipped", findings: [] },
          { verificationType: "scripts", status: "passed", findings: [] },
        ],
      },
    });
  });

  // The complaint the issue opens with: silence hid the only warning there was, leaving a report that said `passed`.
  it("should keep the verdict and the record when nothing is printed", () => {
    expect(box.json("silent.json")).toEqual(box.json("report.json"));
  });

  it("should preserve its inputs and write readable reports", () => {
    expect(
      box
        .manifest()
        .filter(
          (file) => !["report.json", "silent.json", "empty-check.json", "ignore.json", "clean.json"].includes(file.path)
        )
    ).toEqual(inputs);
    expect(box.json("empty-check.json")).toMatchSnapshot();
    expect(box.json("ignore.json")).toMatchSnapshot();
    expect(box.json("clean.json")).toMatchSnapshot();
    expect(
      box.manifest({ normalized: ["report.json", "silent.json", "empty-check.json", "ignore.json", "clean.json"] })
    ).toMatchSnapshot();
  });
});
