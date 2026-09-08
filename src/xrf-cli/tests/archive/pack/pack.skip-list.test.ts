import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack skip list", () => {
  const box = new Sandbox(__filename);

  let skipped: CliResult;
  let kept: CliResult;

  beforeAll(() => {
    // readme.txt is on the built-in skip list of editor and source leftovers.
    const source = box.copyIn(gamedata("configs"), "source");

    box.write("source/readme.txt", "leftover\n");

    skipped = box.run("archive pack", ["--path", source, "--dest", box.at("skipped"), "--name", "a"]);
    kept = box.run("archive pack", ["--path", source, "--dest", box.at("kept"), "--name", "a", "--no-skip-list"]);
  });

  it("should skip editor leftovers by default", () => {
    expect(skipped).toMatchSnapshot();
  });

  it("should keep them when the skip list is off", () => {
    expect(kept).toMatchSnapshot();
  });

  // Keeping one more file has to change the archive, which is what proves the flag did something
  // rather than being accepted and ignored.
  it("should produce a different archive with the skip list off", () => {
    expect(box.sha("kept/a.db")).not.toBe(box.sha("skipped/a.db"));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
