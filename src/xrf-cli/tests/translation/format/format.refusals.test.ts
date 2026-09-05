import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("translation format refusals", () => {
  const box = new Sandbox(__filename);

  let malformed: CliResult;
  let empty: CliResult;
  let missing: CliResult;

  beforeAll(() => {
    box.write("broken/st_broken.json", "{ not json");
    box.write("nothing/notes.txt", "ignored");

    // A source it cannot parse stops the run rather than becoming a finding: a formatter has nothing to write except
    // what it read. Exit 1, not 3.
    malformed = box.run("translation format", ["--path", box.at("broken")], { expectExit: 1 });

    // Selecting nothing is refused, so a renamed directory cannot make a check gate pass over no files at all.
    empty = box.run("translation format", ["--path", box.at("nothing"), "--check"], { expectExit: 1 });
    missing = box.run("translation format", ["--path", box.at("no-such-directory")], { expectExit: 1 });
  });

  it("should stop on a source it cannot parse", () => {
    expect(malformed).toMatchSnapshot();
  });

  it("should refuse a tree holding no sources", () => {
    expect(empty).toMatchSnapshot();
  });

  it("should refuse a path that does not exist", () => {
    expect(missing).toMatchSnapshot();
  });
});
