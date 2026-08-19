import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, sha, type CliResult } from "#/test/sandbox";

// Carries a single texture reference, wpn\wpn_bolt.
const SOURCE = gamedata("meshes/ogf/dev_bolt_hud.ogf");

describe("patch-ogf-texture-refs", () => {
  const box = new Sandbox(__filename);

  let renamed: CliResult;
  let dryRun: CliResult;
  let unmatched: CliResult;
  let info: CliResult;

  beforeAll(() => {
    renamed = box.run("patch-ogf-texture-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("renamed.ogf"),
      "--from",
      "wpn\\wpn_bolt",
      "--to",
      "wpn\\wpn_bolt_renamed",
    ]);
    dryRun = box.run("patch-ogf-texture-refs", [
      "--path",
      SOURCE,
      "--dest",
      box.at("never-renamed.ogf"),
      "--from",
      "wpn\\wpn_bolt",
      "--to",
      "wpn\\wpn_bolt_renamed",
      "--dry-run",
    ]);

    // The rename matches exactly and refuses rather than quietly doing nothing: a typo in --from
    // would otherwise report success while leaving the visual untouched. The refusal lists the
    // references the file actually carries, which is what makes the mistake obvious.
    unmatched = box.run(
      "patch-ogf-texture-refs",
      [
        "--path",
        SOURCE,
        "--dest",
        box.at("unmatched.ogf"),
        "--from",
        "wpn\\does_not_exist",
        "--to",
        "wpn\\replacement",
      ],
      { expectExit: 1 }
    );

    info = box.run("info-ogf", ["--path", box.at("renamed.ogf")]);
  });

  it("should rename a texture ref", () => {
    expect(renamed).toMatchSnapshot();
  });

  it("should report a dry run without writing", () => {
    expect(dryRun).toMatchSnapshot();
  });

  it("should refuse a reference the visual does not carry", () => {
    expect(unmatched).toMatchSnapshot();
  });

  it("should read back the renamed texture reference", () => {
    expect(info).toMatchSnapshot();
  });

  it("should change the bytes it patched", () => {
    expect(box.sha("renamed.ogf")).not.toBe(sha(SOURCE));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
