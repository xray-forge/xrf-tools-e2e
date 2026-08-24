import * as path from "node:path";

export const PROJECT_ROOT: string = path.resolve(__dirname, "../..");

/**
 * Root of the committed gamedata tree every test reads from.
 *
 * @remarks
 * The suite is self-contained: nothing reaches outside the repository, so a clone runs the whole
 * suite identically on any machine and no test can pass or fail because of what happens to sit
 * beside the checkout.
 */
export const RESOURCES_ROOT: string = path.resolve(PROJECT_ROOT, "./src/resources");

export const GAMEDATA_ROOT: string = path.resolve(RESOURCES_ROOT, "./gamedata");

export const TESTS_ROOT: string = path.resolve(PROJECT_ROOT, "./src/tests");

export const TARGET_ROOT: string = path.resolve(PROJECT_ROOT, "./target");

/**
 * Where each test worker drops the timings it measured.
 *
 * @remarks
 * Deliberately outside every sandbox, which lives at `target/<test name>/`. A timing file written
 * inside one would be picked up by `manifest()` and snapshotted, and since durations differ on
 * every run that would make the suite fail constantly. The leading dot also keeps it from ever
 * colliding with a directory named after a test.
 */
export const TIMINGS_ROOT: string = path.resolve(TARGET_ROOT, "./.timings");

/**
 * Aggregated report written once every run has finished.
 */
export const TIMINGS_REPORT: string = path.resolve(TARGET_ROOT, "./timings.json");

export const CLI_EXECUTABLE_NAME: string = process.platform === "win32" ? "xrf-cli.exe" : "xrf-cli";

/**
 * The binary under test, committed so the suite runs without a Rust toolchain.
 *
 * @remarks
 * Refreshed from a sibling build with `npm run cli:refresh`, which leaves the working tree dirty on
 * purpose: `git status` is then the answer to whether the run used the committed reference binary
 * or a local build.
 */
export const CLI_EXECUTABLE: string = path.resolve(PROJECT_ROOT, "./cli/app", CLI_EXECUTABLE_NAME);

export const TOOLS_ROOT: string = path.resolve(PROJECT_ROOT, "../xrf-tools");

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
