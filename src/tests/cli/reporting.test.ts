import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { envelopeAt, envelopeOf, type CommandEnvelope } from "#/test/envelope";
import { Sandbox, type CliResult, type RunOptions } from "#/test/sandbox";

/**
 * The reporting contract itself, rather than any one command's payload.
 *
 * @remarks
 * Every command answers to the same four flags and the same envelope, so this exercises the
 * contract once over the three outcomes the exit codes distinguish - a successful run, a check that
 * judged its input invalid, and a run that could not do its job - instead of repeating it per
 * command. What each command puts under `result` is pinned beside that command.
 */
describe("CLI reporting contract", () => {
  const box = new Sandbox(__filename);

  /** A dialog with an off-schema attribute, which `--strict` judges rather than tallies. */
  const FAILING_DIALOG = '<game_dialogs><dialog id="d" weight="3"/></game_dialogs>';

  let archive: string;
  let dialogs: string;

  /**
   * A command that succeeds and has something to report.
   *
   * @param args - Arguments after the archive path.
   * @param options - Expected exit code.
   * @returns Completed invocation.
   */
  function succeeding(args: Array<string> = [], options: RunOptions = {}): CliResult {
    return box.run("archive info", ["--path", archive, ...args], options);
  }

  /**
   * A check that judges its input invalid, which the failure contract answers with 3.
   *
   * @param args - Arguments after the dialog source selection.
   * @returns Completed invocation, expected to exit 3.
   */
  function failingCheck(args: Array<string> = []): CliResult {
    return box.run("dialog info", ["--path", dialogs, "--source", "directory", "--strict", ...args], {
      expectExit: 3,
    });
  }

  /**
   * A run that cannot do its job at all, which the failure contract answers with 1.
   *
   * @param args - Arguments after the missing archive path.
   * @returns Completed invocation, expected to exit 1.
   */
  function failingExecution(args: Array<string> = []): CliResult {
    return box.run("archive info", ["--path", box.at("missing.db"), ...args], { expectExit: 1 });
  }

  beforeAll(() => {
    box.run("archive pack", ["--path", gamedata("configs"), "--dest", box.at("packed"), "--name", "fixture"]);

    archive = box.at("packed/fixture.db");
    dialogs = box.at("dialogs");

    box.write("dialogs/dialogs.xml", FAILING_DIALOG);
  });

  describe("silent mode", () => {
    it("should say nothing at all for a run that succeeds", () => {
      const result: CliResult = succeeding(["--silent"]);

      expect(result.stdout).toEqual([]);
      expect(result.stderr).toEqual([]);
    });

    // `--silent` mutes the story of a run, never the fact that it failed: a caller reading only the
    // exit code still gets one final line saying what went wrong.
    it("should still report that a run failed", () => {
      const result: CliResult = failingExecution(["--silent"]);

      expect(result.stdout).toEqual([]);
      expect(result.stderr.length).toBeGreaterThan(0);
    });
  });

  describe("human mode", () => {
    it("should describe a run on stdout, and say more when asked", () => {
      const normal: CliResult = succeeding();
      const verbose: CliResult = succeeding(["--verbose"]);

      expect(normal.stdout.length).toBeGreaterThan(0);
      expect(verbose.stdout.length).toBeGreaterThan(normal.stdout.length);
    });
  });

  describe("json stdout mode", () => {
    it("should answer a successful run with one envelope and no human bytes", () => {
      const envelope: CommandEnvelope = envelopeOf(succeeding(["--json"]));

      expect(envelope.command).toEqual(["archive", "info"]);
      expect(envelope.outcome).toBe("success");
      expect(envelope.exitCode).toBe(0);
      expect(envelope.error).toBeNull();
      expect(envelope.result).not.toBeNull();
    });

    // The requirement the whole contract exists for: a run that fails is still readable by a
    // machine, and the payload explaining the verdict survives the failure.
    it("should answer a failing check with an envelope carrying its findings", () => {
      const envelope: CommandEnvelope = envelopeOf(failingCheck(["--json"]));

      expect(envelope.command).toEqual(["dialog", "info"]);
      expect(envelope.outcome).toBe("checkFailed");
      expect(envelope.exitCode).toBe(3);
      expect(envelope.error).toMatch(/finding/);
      expect(JSON.stringify(envelope.result)).toContain("dialog.unknown-attribute");
    });

    it("should answer a run that could not do its job with an envelope too", () => {
      const envelope: CommandEnvelope = envelopeOf(failingExecution(["--json"]));

      expect(envelope.outcome).toBe("executionFailed");
      expect(envelope.exitCode).toBe(1);
      expect(envelope.error).not.toBeNull();
      expect(envelope.result).toBeNull();
    });

    // Human output is not dropped in pipe mode, only moved: a long run still shows progress on a
    // terminal while a caller pipes the document.
    it("should move human output to stderr rather than discarding it", () => {
      expect(succeeding(["--json"]).stderr.length).toBeGreaterThan(0);
      expect(succeeding(["--json", "--silent"]).stderr).toEqual([]);
    });
  });

  describe("json file mode", () => {
    it("should write the envelope to a file without changing human output", () => {
      const human: CliResult = succeeding();
      const reported: CliResult = succeeding(["--report", box.at("report.json")]);

      expect(reported.stdout).toEqual(human.stdout);

      const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

      expect(envelope.command).toEqual(["archive", "info"]);
      expect(envelope.outcome).toBe("success");
      expect(envelope.result).not.toBeNull();
    });

    it("should write a report for a failing check as well", () => {
      failingCheck(["--report", box.at("failed.json")]);

      const envelope: CommandEnvelope = envelopeAt(box.at("failed.json"));

      expect(envelope.outcome).toBe("checkFailed");
      expect(envelope.exitCode).toBe(3);
    });

    it("should end the report with a newline, as a text file", () => {
      succeeding(["--report", box.at("newline.json")]);

      expect(fs.readFileSync(box.at("newline.json"), "utf8").endsWith("\n")).toBe(true);
    });

    // A report the caller is waiting for is part of what they asked for, so failing to deliver it
    // fails the run rather than letting a stale file be read as this run's answer.
    it("should fail the run when the report cannot be written", () => {
      const result: CliResult = succeeding(["--report", box.at("missing/report.json")], { expectExit: 1 });

      expect(result.stderr.join("\n")).toMatch(/report/i);
    });

    /**
     * The failure mode this rule exists for.
     *
     * @remarks
     * Answering 3 here would be byte-identical to a check that failed and did write its report, so a
     * script branching on 3 would go on to parse a destination still holding the previous run's
     * document - the staged writer preserves it precisely so a failed write destroys nothing. Exit 1
     * is what separates the two, and the check's own verdict is still said on stderr.
     */
    it("should answer an undeliverable report with 1 even when the check itself failed", () => {
      const result: CliResult = box.run(
        "dialog info",
        ["--path", dialogs, "--source", "directory", "--strict", "--report", box.at("missing/failed.json")],
        { expectExit: 1 }
      );

      const said: string = result.stderr.join("\n");

      expect(said).toMatch(/finding/);
      expect(said).toMatch(/report/i);
    });
  });

  describe("incompatible selections", () => {
    it("should refuse a report that is both piped and written", () => {
      const result: CliResult = succeeding(["--json", "--report", box.at("unused.json")], { expectExit: 2 });

      expect(result.stderr.join("\n")).toMatch(/cannot be used with/);
    });

    it("should refuse a run that asks to be both quiet and loud", () => {
      const result: CliResult = succeeding(["--silent", "--verbose"], { expectExit: 2 });

      expect(result.stderr.join("\n")).toMatch(/cannot be used with/);
    });

    /**
     * The flags are global, so a caller may write one before the command and the other after it.
     */
    it("should refuse a contradictory pair written at two levels", () => {
      const quiet: CliResult = box.run("", ["--verbose", "archive", "info", "--path", archive, "--silent"], {
        expectExit: 2,
      });
      const both: CliResult = box.run(
        "",
        ["--json", "archive", "info", "--path", archive, "--report", box.at("unused.json")],
        { expectExit: 2 }
      );

      expect(quiet.stderr.join("\n")).toMatch(/cannot be used with/);
      expect(both.stderr.join("\n")).toMatch(/cannot be used with/);
    });

    it("should still accept a global flag written before the command", () => {
      const result: CliResult = box.run("", ["--verbose", "archive", "info", "--path", archive]);

      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });
});
