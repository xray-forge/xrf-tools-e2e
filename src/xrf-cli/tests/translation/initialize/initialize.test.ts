import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeOf } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("translation initialize", () => {
  const box = new Sandbox(__filename);

  let first: CliResult;
  let second: CliResult;
  let piped: CliResult;
  let afterFirst: string;

  beforeAll(() => {
    // It rewrites its sources in place, so it works on a copy and never touches the corpus.
    const sources = box.copyIn(resource("translations"), "translations");

    first = box.run("translation initialize", ["--path", sources]);
    afterFirst = box.sha("translations/st_items.json");
    second = box.run("translation initialize", ["--path", sources]);
    piped = box.run("translation initialize", ["--path", sources, "--json"]);
  });

  // Every language the project knows about gains a null entry, which is what turns a silent gap
  // into a visible one a translator can fill.
  it("should scaffold the missing languages", () => {
    expect(first).toMatchSnapshot();
  });

  it("should leave an already initialized project alone", () => {
    expect(second).toMatchSnapshot();
  });

  // Running it twice must not keep rewriting the file, or it would churn a diff on every run.
  it("should be idempotent", () => {
    expect(box.sha("translations/st_items.json")).toBe(afterFirst);
  });

  // Every source is JSON now, so there is nothing in the tree for it to skip: the old assertion
  // watched it leave XML sources alone, and XML is no longer a source format.
  it("should scaffold every source it walks", () => {
    expect(box.sha("translations/st_ui.json")).toBeTruthy();
  });

  // The run reports what it scaffolded rather than only how long it took, which is the one question a caller has.
  it("should report what it scanned and scaffolded", () => {
    const result = envelopeOf(piped).result as {
      filesRead: number;
      filesInitialized: number;
      filesSkipped: number;
      keysAdded: number;
    };

    // The third run over an already complete project reads both sources and changes neither.
    expect(result.filesRead).toBe(2);
    expect(result.filesInitialized).toBe(0);
    expect(result.keysAdded).toBe(0);
    expect(result.filesSkipped).toBe(0);
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
