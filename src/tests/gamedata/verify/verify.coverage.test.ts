import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/test/envelope";
import { Sandbox, type CliResult } from "#/test/sandbox";

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

  beforeAll(() => {
    box.write("install/fsgame.ltx", FSGAME);
    // Formatter-shaped, CRLF included, so the selected check passes and the verdict can only come from lost coverage.
    box.write("install/gamedata/configs/system.ltx", "[section]\r\nvalue = 1\r\n");
    box.write(CORRUPT_VOLUME, "not an archive volume");

    // Deliberately a check that has nothing to do with archives: a narrow selection must not turn an installation whose
    // whole archive set went unread into a passing run.
    verify = box.run("gamedata verify", [box.at("install"), "--checks", "ltx", "--report", box.at("report.json")], {
      expectExit: 1,
    });

    box.run("gamedata verify", [box.at("install"), "--checks", "ltx", "--silent", "--report", box.at("silent.json")], {
      expectExit: 1,
    });
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

  // The complaint the issue opens with: silence hid the only warning there was, leaving a report that said `passed`.
  it("should keep the verdict and the record when nothing is printed", () => {
    expect(box.json("silent.json")).toEqual(box.json("report.json"));
  });

  it("should write only its reports", () => {
    expect(box.manifest({ normalized: ["report.json", "silent.json"] })).toMatchSnapshot();
  });
});
