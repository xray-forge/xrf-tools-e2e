import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

// A descriptor the SDK wrote.
const SOURCE = gamedata("textures/act_cat_bump.thm");

describe("thm info", () => {
  const box = new Sandbox(__filename);

  let described: CliResult;
  let notThumbnail: CliResult;

  beforeAll(() => {
    described = box.run("thm info", [SOURCE, "--report", box.at("info.json")]);
    notThumbnail = box.run("thm info", [box.write("text.thm", "not a thumbnail")], { expectExit: 1 });
  });

  it("should print every field of a texture descriptor", () => {
    expect(described).toMatchSnapshot();
  });

  it("should report the descriptor as the reader reads it", () => {
    expect(box.json("info.json")).toMatchSnapshot();
  });

  it("should refuse a file that is not a thumbnail", () => {
    expect(notThumbnail).toMatchSnapshot();
  });

  it("should write only the report", () => {
    expect(box.manifest({ normalized: ["info.json"] })).toMatchSnapshot();
  });
});
