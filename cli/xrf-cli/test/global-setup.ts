import * as cp from "node:child_process";
import * as fs from "node:fs";

import { CLI_EXECUTABLE, CLI_E2E_OUTPUT_ROOT } from "./constants";

/**
 * States which binary the run is about to exercise.
 *
 * @remarks
 * The suite deliberately does not build. The executable describes the source and workflow that
 * produced it before any scenario starts.
 */
export default function globalSetup(): void {
  fs.rmSync(CLI_E2E_OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(CLI_E2E_OUTPUT_ROOT, { recursive: true });

  if (!fs.existsSync(CLI_EXECUTABLE)) {
    throw new Error(`No executable at '${CLI_EXECUTABLE}'.\nRun 'npm run cli:refresh' or use the E2E workflow.`);
  }

  const version: string = cp.execFileSync(CLI_EXECUTABLE, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (!version.trim()) {
    throw new Error(`Executable at '${CLI_EXECUTABLE}' returned an empty version.`);
  }

  console.log();
  console.log(version.trim());
  console.log();
}
