import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("ltx format roundtrip", () => {
  const box = new Sandbox(__filename);

  let checkBefore: CliResult;
  let format: CliResult;
  let checkAfter: CliResult;
  let verify: CliResult;

  beforeAll(() => {
    // The formatter rewrites in place, so it works on a copy and never touches the corpus.
    const configs = box.copyIn(gamedata("configs"), "configs");

    // Vanilla configs are not in the formatter's shape; rejecting them is the expected answer.
    checkBefore = box.run("ltx format", ["--path", configs, "--check"], { expectExit: 3 });
    format = box.run("ltx format", ["--path", configs]);
    checkAfter = box.run("ltx format", ["--path", configs, "--check"]);
    verify = box.run("ltx verify", ["--path", configs]);
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
