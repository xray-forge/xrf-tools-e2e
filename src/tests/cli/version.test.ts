import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/test/sandbox";
import type { Nullable } from "#/test/types";

/**
 * A `label: value` line of the long form, which is every line after the first.
 */
const DETAIL_PATTERN = /^([a-z ]+):\s+(.+)$/;

/**
 * Detail lines of the long form, as label to value.
 *
 * @param result - Completed `--version` invocation.
 * @returns Each `label: value` line keyed by its label, first line excluded.
 */
function detailsOf(result: CliResult): Record<string, string> {
  return Object.fromEntries(
    result.stdout.slice(1).flatMap((line: string) => {
      const matched: Nullable<RegExpExecArray> = DETAIL_PATTERN.exec(line);

      return matched ? [[matched[1], matched[2]] as [string, string]] : [];
    })
  );
}

/**
 * Which build produced the binary, and enough to trace it back to a commit and a workflow run.
 *
 * @remarks
 * Values are asserted by shape rather than recorded, because each one differs between two builds of
 * the same source: the commit, the host toolchain, the profile, whether the tree was dirty. Only the
 * set of field names is snapshotted, so the recording moves when the reported surface changes rather
 * than every time someone rebuilds the binary.
 */
describe("CLI version reporting", () => {
  const box = new Sandbox(__filename);

  let long: CliResult;
  let short: CliResult;

  beforeAll(() => {
    long = box.run("", ["--version"]);
    short = box.run("", ["-V"]);
  });

  it("should answer the short form with one identifying line", () => {
    expect(short.exitCode).toBe(0);
    expect(short.stderr).toEqual([]);
    expect(short.stdout).toHaveLength(1);
    expect(short.stdout[0]).toMatch(/^xrf-cli \d+\.\d+\.\d+ \((local|development|optimized)(, [0-9a-f]{7})?\)$/);
  });

  it("should open the long form with the same identity", () => {
    expect(long.exitCode).toBe(0);
    expect(long.stderr).toEqual([]);
    expect(long.stdout[0]).toMatch(/^xrf-cli \d+\.\d+\.\d+ \((local|development|optimized)\)$/);
  });

  /**
   * A binary built by CI reports one field more than a local one - the workflow run it came from -
   * so this recording moving is the expected outcome of refreshing `cli/app` from a workflow
   * artifact rather than from a developer's `target/release`. It says where the binary came from.
   */
  it("should describe the build through a stable set of fields", () => {
    expect(Object.keys(detailsOf(long))).toMatchSnapshot();
  });

  it("should carry a commit and a toolchain the build can be traced to", () => {
    const details: Record<string, string> = detailsOf(long);

    expect(details["commit"]).toMatch(/^[0-9a-f]{40}( on \S+)?( \(dirty\))?$/);
    expect(details["rustc"]).toMatch(/^rustc \d+\.\d+\.\d+/);
    expect(details["target"]).toMatch(/^\S+$/);
    expect(details["profile"]).toMatch(/^(debug|release)$/);
  });
});
