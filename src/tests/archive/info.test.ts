import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("archive info", () => {
  const box = new Sandbox(__filename);

  let result: CliResult;

  beforeAll(() => {
    box.run("archive pack", ["--path", gamedata("configs"), "--dest", box.at("packed"), "--name", "fixture"]);

    result = box.run("archive info", ["--path", box.at("packed"), "--verbose"]);
  });

  it("should describe a volume set and its entries", () => {
    expect(result).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
