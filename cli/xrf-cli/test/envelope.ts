import * as fs from "node:fs";

import { expect } from "@jest/globals";

import type { Optional } from "../../types";

import type { CliResult } from "./sandbox";

/**
 * How much of the machine a run was bounded to.
 *
 * @remarks
 * Carried by every run, including the commands that declare no `--jobs`: every command runs inside a
 * pool whether or not it offers a say in how wide that pool is. `workers` is normalized out of
 * recordings because it describes the host. Whether a `-j` chose it is on the `Workers:` console line.
 */
export interface ExecutionPlan {
  workers: number;
}

/**
 * The envelope every command answers with when a machine-readable report was asked for.
 */
export interface CommandEnvelope {
  command: Array<string>;
  duration: number;
  error?: Optional<string>;
  execution: ExecutionPlan;
  exitCode: number;
  result?: unknown;
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
