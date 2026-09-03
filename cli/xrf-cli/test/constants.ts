import * as path from "node:path";

export const PROJECT_ROOT: string = path.resolve(__dirname, "../../..");

/**
 * Root of the committed gamedata tree every test reads from.
 *
 * @remarks
 * The suite is self-contained: nothing reaches outside the repository, so a clone runs the whole
 * suite identically on any machine and no test can pass or fail because of what happens to sit
 * beside the checkout.
 */
export const RESOURCES_ROOT: string = path.resolve(PROJECT_ROOT, "./src/xrf-cli/resources");

export const GAMEDATA_ROOT: string = path.resolve(RESOURCES_ROOT, "./gamedata");

export const TESTS_ROOT: string = path.resolve(PROJECT_ROOT, "./src/xrf-cli/tests");

export const TARGET_ROOT: string = path.resolve(PROJECT_ROOT, "./target");

/** Generated state from one E2E run, deleted before any test suite starts. */
export const E2E_OUTPUT_ROOT: string = path.resolve(TARGET_ROOT, "./e2e");

/** Isolated working directories for test suites. */
export const SANDBOXES_ROOT: string = path.resolve(E2E_OUTPUT_ROOT, "./sandboxes");

/**
 * Where each test worker drops the timings it measured.
 *
 * @remarks
 * Deliberately outside every sandbox so `manifest()` cannot snapshot durations that differ on every
 * run.
 */
export const TIMINGS_ROOT: string = path.resolve(E2E_OUTPUT_ROOT, "./timings");

/**
 * Aggregated report written once every run has finished.
 */
export const TIMINGS_REPORT: string = path.resolve(E2E_OUTPUT_ROOT, "./timings.json");

/**
 * The name the CLI is recorded under, whatever the host calls the file.
 *
 * @remarks
 * Clap prints the executable it was invoked as in every usage line, so help output carries the
 * platform's file name. That is a property of the host, not of the tool, and snapshots are recorded
 * under this stem on every platform — see `normalizeText`.
 */
export const CLI_EXECUTABLE_STEM: string = "xrf-cli";

export const CLI_EXECUTABLE_NAME: string =
  process.platform === "win32" ? `${CLI_EXECUTABLE_STEM}.exe` : CLI_EXECUTABLE_STEM;

/**
 * The ignored binary under test.
 *
 * @remarks
 * CI downloads the current nightly asset here. `npm run cli:refresh` copies a local build to the same
 * path, so every test and fixture script uses one location.
 */
export const CLI_EXECUTABLE: string = path.resolve(TARGET_ROOT, CLI_EXECUTABLE_NAME);

/**
 * Refers to a file in the committed gamedata tree.
 *
 * @param relative - Path relative to the gamedata root, for example `meshes/ogf/part_none.ogf`.
 * @returns Absolute path.
 */
export function gamedata(relative: string = ""): string {
  return relative ? path.resolve(GAMEDATA_ROOT, relative) : GAMEDATA_ROOT;
}

/**
 * Refers to a committed resource that is not part of the gamedata tree.
 *
 * @remarks
 * For inputs a command consumes to produce gamedata rather than reads out of it, such as the
 * translation sources that `translation build` compiles into per-language string tables.
 *
 * @param relative - Path relative to the resources root, for example `translations`.
 * @returns Absolute path.
 */
export function resource(relative: string = ""): string {
  return relative ? path.resolve(RESOURCES_ROOT, relative) : RESOURCES_ROOT;
}
