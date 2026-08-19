import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("format-ltx roundtrip", () => {
  const box = new Sandbox(__filename);

  let checkBefore: CliResult;
  let format: CliResult;
  let checkAfter: CliResult;
  let verify: CliResult;

  beforeAll(() => {
    // The formatter rewrites in place, so it works on a copy and never touches the corpus.
    const configs = box.copyIn(gamedata("configs"), "configs");

    // Vanilla configs are not in the formatter's shape; rejecting them is the expected answer.
    checkBefore = box.run("format-ltx", ["--path", configs, "--check"], { expectExit: 1 });
    format = box.run("format-ltx", ["--path", configs]);
    checkAfter = box.run("format-ltx", ["--path", configs, "--check"]);
    verify = box.run("verify-ltx", ["--path", configs]);
  });

  it("should reject unformatted configs", () => {
    expect(checkBefore).toMatchSnapshot();
  });

  it("should rewrite them", () => {
    expect(format).toMatchSnapshot();
  });

  it("should accept what it just wrote", () => {
    expect(checkAfter).toMatchSnapshot();
  });

  it("should not change what the files mean", () => {
    expect(verify).toMatchSnapshot();
  });

  it("should write the formatted bytes", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
