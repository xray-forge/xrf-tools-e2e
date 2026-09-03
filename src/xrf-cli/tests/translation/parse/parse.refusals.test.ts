import { describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

const MOD_ARGS: Array<string> = ["--path", resource("mod-text"), "--source", "directory"];

describe("translation parse guards the language it was given", () => {
  const box = new Sandbox(__filename);

  // Naming the text root with a language that has no directory there would otherwise read every
  // language's files and file them all under that one name, with nothing to say it happened.
  it("should refuse a scope still holding other languages", () => {
    expect(
      box.run(
        "translation parse",
        [...MOD_ARGS, "--prefix", "configs\\text", "--language", "pol", "--output", box.at("refused")],
        { expectExit: 1 }
      )
    ).toMatchSnapshot();
  });

  // One run files everything it reads under one language key, and `all` is not one.
  it("should refuse the all language", () => {
    expect(
      box.run("translation parse", [...MOD_ARGS, "--language", "all", "--output", box.at("refused")], {
        expectExit: 1,
      })
    ).toMatchSnapshot();
  });

  it("should write nothing when it refuses", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
