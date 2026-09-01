import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("translation format refusals", () => {
  const box = new Sandbox(__filename);

  let malformed: CliResult;
  let empty: CliResult;
  let missing: CliResult;
  let assertedEndings: CliResult;

  beforeAll(() => {
    const sources = box.copyIn(resource("translations"), "translations");

    box.write("broken/st_broken.json", "{ not json");
    box.write("nothing/notes.txt", "ignored");

    // A source it cannot parse stops the run rather than becoming a finding: a formatter has nothing to write except
    // what it read. Exit 1, not 3.
    malformed = box.run("translation format", ["--path", box.at("broken")], { expectExit: 1 });

    // Selecting nothing is refused, so a renamed directory cannot make a check gate pass over no files at all.
    empty = box.run("translation format", ["--path", box.at("nothing"), "--check"], { expectExit: 1 });
    missing = box.run("translation format", ["--path", box.at("no-such-directory")], { expectExit: 1 });

    // Line endings are unjudged unless asserted; asserting the spelling the files do not use arms the check.
    box.run("translation format", ["--path", sources]);
    assertedEndings = box.run("translation format", ["--path", sources, "--check", "--line-endings", "crlf"], {
      expectExit: 3,
    });
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

  it("should judge line endings only when they are asserted", () => {
    expect(assertedEndings).toMatchSnapshot();
  });
});
