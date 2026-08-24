import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

describe("translation initialize", () => {
  const box = new Sandbox(__filename);

  let first: CliResult;
  let second: CliResult;
  let afterFirst: string;

  beforeAll(() => {
    // It rewrites its sources in place, so it works on a copy and never touches the corpus.
    const sources = box.copyIn(resource("translations"), "translations");

    first = box.run("translation initialize", ["--path", sources]);
    afterFirst = box.sha("translations/st_items.json");
    second = box.run("translation initialize", ["--path", sources]);
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

  it("should not touch the xml sources", () => {
    expect(box.sha("translations/st_ui.eng.xml")).toBe(sha(resource("translations/st_ui.eng.xml")));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
