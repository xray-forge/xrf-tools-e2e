import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const BROKEN = '<game_dialogs><dialog id="d">';
const READABLE =
  '<game_dialogs><dialog id="ok"><phrase_list><phrase id="0"><text>a</text></phrase></phrase_list></dialog></game_dialogs>';

/**
 * A sweep is neither a reader nor a verifier. A reader refuses damaged input, a verifier judges it,
 * and this records it and carries on: sweeping several reference trees exists to produce a tally,
 * and stopping at the first unparseable file would never produce one. The inputs are authored here
 * because a damaged file in the committed tree would follow every other command around.
 */
describe("dialog info meets damaged input", () => {
  const box = new Sandbox(__filename);

  let swept: CliResult;
  let strict: CliResult;
  let unrelated: CliResult;
  let missing: CliResult;

  beforeAll(() => {
    box.write("tree/dialogs_broken.xml", BROKEN);
    box.write("tree/dialogs_readable.xml", READABLE);

    swept = box.run("dialog info", ["--path", box.at("tree"), "--source", "directory", "--verbose"]);
    strict = box.run("dialog info", ["--path", box.at("tree"), "--source", "directory", "--strict"], {
      expectExit: 3,
    });

    // Dialog files are named by convention, so a gameplay xml that is not one is not swept.
    box.write("portions/info_test.xml", "<game_information_portions/>");
    unrelated = box.run("dialog info", ["--path", box.at("portions"), "--source", "directory"], { expectExit: 1 });

    // A mistyped path mounts an empty world rather than failing outright, and a sweep that read
    // nothing must not report success: that is how a check gets wired into CI and checks nothing.
    missing = box.run("dialog info", ["--path", box.at("absent"), "--source", "directory"], { expectExit: 1 });
  });

  // The readable file is still counted, and the damaged one is named with the reason it failed.
  it("should record an unparseable file and read the rest", () => {
    expect(swept).toMatchSnapshot();
  });

  it("should turn the same damage into a check failure under strict", () => {
    expect(strict).toMatchSnapshot();
  });

  it("should refuse a tree holding no dialog files", () => {
    expect(unrelated).toMatchSnapshot();
  });

  it("should refuse a path that does not exist", () => {
    expect(missing).toMatchSnapshot();
  });

  it("should write nothing beyond the authored inputs", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
