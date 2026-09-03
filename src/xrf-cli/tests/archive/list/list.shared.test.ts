import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("archive list shared payloads", () => {
  const box = new Sandbox(__filename);

  let listed: CliResult;
  let found: CliResult;

  beforeAll(() => {
    // Two names for one file: the packer stores the bytes once and points the second row at them, which the format
    // records only as two descriptors with equal fields.
    box.copyIn(gamedata("configs"), "source/configs");
    box.copyIn(gamedata("configs/system.ltx"), "source/configs/system_copy.ltx");

    box.run("archive pack", ["--path", box.at("source"), "--dest", box.at("packed"), "--name", "fixture"]);

    listed = box.run("archive list", [
      "--path",
      box.at("packed/fixture.db"),
      "--files",
      "--verbose",
      "--report",
      box.at("listing.json"),
    ]);
    found = box.run("archive find", ["--path", box.at("packed/fixture.db"), "--query", "system_copy", "--verbose"]);
  });

  it("should say which entries read the same bytes", () => {
    expect(listed).toMatchSnapshot();
  });

  it("should report every entry's sharers as derived from the descriptors", () => {
    expect(box.json("listing.json")).toMatchSnapshot();
  });

  it("should name a match's sharers even when the query left them out", () => {
    expect(found).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["listing.json"] })).toMatchSnapshot();
  });
});
