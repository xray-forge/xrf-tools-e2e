import { beforeAll, describe, expect, it } from "@jest/globals";

import { ltxUnformatted } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

/**
 * What the formatter actually rewrites, line by line.
 */
describe("ltx format samples", () => {
  const box = new Sandbox(__filename);

  const SAMPLES: Array<string> = ["formatted.ltx", "spacing.ltx", "structure.ltx"];

  const before: Record<string, Array<string>> = {};
  const after: Record<string, Array<string>> = {};

  let check: CliResult;
  let format: CliResult;
  let recheck: CliResult;
  let formatAgain: CliResult;
  let manifestBeforeCheck: Array<ManifestFile>;
  let manifestAfterCheck: Array<ManifestFile>;
  let manifestAfterFormat: Array<ManifestFile>;
  let manifestAfterIdempotentFormat: Array<ManifestFile>;

  beforeAll(() => {
    // The formatter rewrites in place, so it works on a copy and never touches the corpus.
    const samples: string = box.copyIn(ltxUnformatted(), "samples");

    for (const sample of SAMPLES) {
      before[sample] = box.raw(`samples/${sample}`);
    }

    manifestBeforeCheck = box.manifest();

    check = box.run("ltx format", ["--path", samples, "--check"], { expectExit: 3 });
    manifestAfterCheck = box.manifest();

    format = box.run("ltx format", ["--path", samples]);

    for (const sample of SAMPLES) {
      after[sample] = box.raw(`samples/${sample}`);
    }

    manifestAfterFormat = box.manifest();
    recheck = box.run("ltx format", ["--path", samples, "--check"]);
    formatAgain = box.run("ltx format", ["--path", samples]);
    manifestAfterIdempotentFormat = box.manifest();
  });

  it("should read the samples as they were authored", () => {
    expect(before).toMatchSnapshot();
  });

  it("should reject the two that are not formatted", () => {
    expect(check).toMatchSnapshot();
  });

  it("should leave every input byte untouched while checking", () => {
    expect(manifestAfterCheck).toEqual(manifestBeforeCheck);
  });

  it("should rewrite only those two", () => {
    expect(format).toMatchSnapshot();
  });

  it("should write the canonical shape", () => {
    expect(after).toMatchSnapshot();
  });

  it("should leave a file that already holds the canonical bytes untouched", () => {
    // Compared against the committed resource rather than against the copy, so the assertion still
    // fails if the copy itself were rewritten before the first snapshot was taken.
    expect(box.sha("samples/formatted.ltx")).toBe(sha(ltxUnformatted("formatted.ltx")));
  });

  it("should accept what it just wrote", () => {
    expect(recheck).toMatchSnapshot();
  });

  // A second rewrite must find nothing left to do, or the command could not gate a build.
  it("should be idempotent", () => {
    expect(formatAgain).toMatchSnapshot();
    expect(manifestAfterIdempotentFormat).toEqual(manifestAfterFormat);
  });

  it("should write no file beside the samples it was given", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
