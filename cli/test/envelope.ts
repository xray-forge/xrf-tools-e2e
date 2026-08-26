import * as fs from "node:fs";

import { expect } from "@jest/globals";

import type { CliResult } from "./sandbox";
import type { Nullable } from "./types";

/**
 * How a run ended, in the words the machine contract uses.
 */
export type CommandOutcome = "success" | "checkFailed" | "executionFailed";

/**
 * The envelope every command answers with when a machine-readable report was asked for.
 *
 * @remarks
 * Deliberately unversioned: everything in it is something the CLI already promises through its exit
 * contract. What a command wants to say beyond that lives in `result`, which is that command's own
 * shape and is pinned beside it rather than here.
 */
export interface CommandEnvelope {
  command: Array<string>;
  duration: number;
  error: Nullable<string>;
  exitCode: number;
  outcome: CommandOutcome;
  result: unknown;
}

/**
 * Parses the single JSON document a `--json` run puts on stdout.
 *
 * @remarks
 * Asserting that stdout is exactly one parseable document is the whole point of pipe mode, so this
 * refuses anything else rather than searching the stream for something that looks like JSON. A
 * human byte reaching stdout would corrupt what a caller piped, and it would show up right here.
 *
 * @param result - Completed invocation run with `--json`.
 * @returns The parsed envelope.
 */
export function envelopeOf(result: CliResult): CommandEnvelope {
  expect(result.stdout).toHaveLength(1);

  return JSON.parse(result.stdout.join("")) as CommandEnvelope;
}

/**
 * Reads a report a run was told to write to a file.
 *
 * @param reportPath - Absolute path passed to `--report`.
 * @returns The parsed envelope.
 */
export function envelopeAt(reportPath: string): CommandEnvelope {
  return JSON.parse(fs.readFileSync(reportPath, "utf8")) as CommandEnvelope;
}
