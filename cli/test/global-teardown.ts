import * as fs from "node:fs";
import * as path from "node:path";

import { TIMINGS_REPORT, TIMINGS_ROOT } from "./constants";
import { type CommandTiming } from "./sandbox";

interface CommandSummary {
  command: string;
  runs: number;
  totalMs: number;
  averageMs: number;
  slowestMs: number;
}

function readRecordedTimings(): Array<CommandTiming> {
  if (!fs.existsSync(TIMINGS_ROOT)) {
    return [];
  }

  return fs
    .readdirSync(TIMINGS_ROOT)
    .filter((entry) => entry.endsWith(".json"))
    .flatMap((entry) => JSON.parse(fs.readFileSync(path.join(TIMINGS_ROOT, entry), "utf8")) as Array<CommandTiming>);
}

/**
 * Collapses every invocation into one row per command.
 *
 * @param timings - Every recorded invocation.
 * @returns Summaries ordered by total time, so the commands worth optimizing come first.
 */
function summarize(timings: Array<CommandTiming>): Array<CommandSummary> {
  const byCommand: Map<string, Array<CommandTiming>> = new Map();

  for (const timing of timings) {
    const bucket: Array<CommandTiming> = byCommand.get(timing.command) ?? [];

    bucket.push(timing);
    byCommand.set(timing.command, bucket);
  }

  return [...byCommand.entries()]
    .map(([command, runs]) => {
      const totalMs: number = runs.reduce((total, run) => total + run.durationMs, 0);

      return {
        command,
        runs: runs.length,
        totalMs,
        averageMs: Math.round(totalMs / runs.length),
        slowestMs: Math.max(...runs.map((run) => run.durationMs)),
      };
    })
    .sort((first, second) => second.totalMs - first.totalMs);
}

/**
 * Merges the per-worker timing files into one report.
 *
 * @remarks
 * Runs once in the main process after every worker has finished, which is the only point where all
 * the measurements exist together. The report is written under `target/` and never committed, so
 * it can record durations without any of it reaching a snapshot.
 */
export default function globalTeardown(): void {
  const timings: Array<CommandTiming> = readRecordedTimings();

  if (timings.length === 0) {
    return;
  }

  const commands: Array<CommandSummary> = summarize(timings);
  const totalMs: number = commands.reduce((total, command) => total + command.totalMs, 0);

  fs.writeFileSync(
    TIMINGS_REPORT,
    `${JSON.stringify({ totalMs, invocations: timings.length, commands, runs: timings }, undefined, 2)}\n`,
    "utf8"
  );

  const slowest: Array<string> = commands.slice(0, 3).map((command) => `${command.command} ${command.totalMs}ms`);

  console.log(
    `\ncli time ${totalMs}ms across ${timings.length} invocations; slowest ${slowest.join(", ")}` +
      `\ntimings: ${TIMINGS_REPORT}`
  );
}
