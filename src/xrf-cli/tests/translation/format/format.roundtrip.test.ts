import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("translation format roundtrip", () => {
  const box = new Sandbox(__filename);

  let checkBefore: CliResult;
  let format: CliResult;
  let checkAfter: CliResult;
  let formatAgain: CliResult;
  let verify: CliResult;
  let afterFirst: string;

  beforeAll(() => {
    // The formatter rewrites in place, so it works on a copy and never touches the corpus.
    const sources = box.copyIn(resource("translations"), "translations");

    // The fixture is authored the way a person types one: ids out of order and entries on a single line.
    checkBefore = box.run("translation format", ["--path", sources, "--check"], { expectExit: 3 });
    format = box.run("translation format", ["--path", sources]);
    afterFirst = box.sha("translations/st_items.json");
    checkAfter = box.run("translation format", ["--path", sources, "--check"]);
    formatAgain = box.run("translation format", ["--path", sources]);
    verify = box.run("translation verify", ["--path", sources, "-l", "eng"]);
  });

  it("should reject unformatted sources", () => {
    expect(checkBefore).toMatchSnapshot();
  });

  it("should rewrite them", () => {
    expect(format).toMatchSnapshot();
  });

  it("should accept what it just wrote", () => {
    expect(checkAfter).toMatchSnapshot();
  });

  // A second rewrite must find nothing left to do, or the command could not gate a build.
  it("should be idempotent", () => {
    expect(formatAgain).toMatchSnapshot();
    expect(box.sha("translations/st_items.json")).toBe(afterFirst);
  });

  it("should not change what the sources mean", () => {
    expect(verify).toMatchSnapshot();
  });

  it("should write the formatted bytes", () => {
    expect(box.json("translations/st_items.json")).toMatchSnapshot();
    expect(box.manifest()).toMatchSnapshot();
  });
});
