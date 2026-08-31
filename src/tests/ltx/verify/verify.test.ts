import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("ltx verify", () => {
  const box = new Sandbox(__filename);

  let verify: CliResult;

  beforeAll(() => {
    // The command takes a configs root rather than a single file.
    verify = box.run("ltx verify", ["--path", gamedata("configs")]);
  });

  it("should report section and field coverage", () => {
    expect(verify).toMatchSnapshot();
  });

  it("should write nothing", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
