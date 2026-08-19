import * as cp from "node:child_process";
import * as fs from "node:fs";

import { CLI_EXECUTABLE, TIMINGS_REPORT, TIMINGS_ROOT, TOOLS_ROOT } from "./constants";
import { sha } from "./sandbox";
import { type Optional } from "./types";

function readToolsRevision(): Optional<string> {
  const spawned: cp.SpawnSyncReturns<string> = cp.spawnSync(
    "git",
    ["-c", "safe.directory=*", "-C", TOOLS_ROOT, "rev-parse", "--short", "HEAD"],
    { encoding: "utf8", windowsHide: true }
  );

  return spawned.status === 0 ? spawned.stdout.trim() : undefined;
}

/**
 * States which binary the run is about to exercise.
 *
 * @remarks
 * The suite deliberately does not build; the executable is committed and refreshed on demand. That
 * makes its identity something to report rather than assume, so a run that is quietly exercising
 * last month's binary is visible instead of silent.
 */
export default function globalSetup(): void {
  if (!fs.existsSync(CLI_EXECUTABLE)) {
    throw new Error(`No executable at '${CLI_EXECUTABLE}'.\nRun 'npm run cli:refresh' to copy one from ${TOOLS_ROOT}.`);
  }

  // Cleared here rather than appended to, so the report describes this run only and a test that was
  // renamed or deleted cannot leave its measurements behind.
  fs.rmSync(TIMINGS_ROOT, { recursive: true, force: true });
  fs.rmSync(TIMINGS_REPORT, { force: true });

  const revision: Optional<string> = readToolsRevision();
  const mtime: string = fs.statSync(CLI_EXECUTABLE).mtime.toISOString();

  console.log(`xrf-cli  sha256 ${sha(CLI_EXECUTABLE).slice(0, 12)}  built ${mtime}`);
  console.log(`tools    ${revision ? `${revision} (working tree)` : "revision unknown"}`);
}
