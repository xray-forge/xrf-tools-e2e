import { beforeAll, describe, expect, it } from "@jest/globals";

import {
  ADDED_WEAPON_LTX,
  EDITED_SYSTEM_LTX,
  createInstallation,
  listPatchedEntries,
} from "#/xrf-cli/test/patch-worlds";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack-patch split input", () => {
  const box = new Sandbox(__filename);

  let published: CliResult;
  let carried: Array<string>;

  beforeAll(() => {
    // One installation: volumes holding the release, a loose `gamedata\` holding one edit and one new file.
    const install: string = createInstallation(box, "game", [
      { content: EDITED_SYSTEM_LTX, path: "configs/system.ltx" },
      { content: ADDED_WEAPON_LTX, path: "configs/weapons/wpn_added.ltx" },
    ]);

    published = box.run("archive pack-patch", [
      install,
      "--dest",
      box.at("patch"),
      "--name",
      "mypatch",
      "--report",
      box.at("split.json"),
    ]);

    carried = listPatchedEntries(box, box.at("patch"), "listed.json");
  });

  it("should compare the volumes against the loose tree of one input", () => {
    expect(published).toMatchSnapshot();
  });

  it("should carry the edited and the new loose file and nothing else", () => {
    // Neither hand-written spelling reaches this. Naming the installation on both sides finds every loose file equal
    // to itself, because the loose tree wins inside the merged world; naming `db\` mounts only the volumes directly
    // in it, so the same two files come back as added rather than one added and one modified.
    expect(carried).toEqual(["configs\\system.ltx", "configs\\weapons\\wpn_added.ltx"]);
  });

  it("should classify the overriding file as modified rather than added", () => {
    const report = box.json("split.json") as {
      result: { added: Array<{ name: string }>; modified: Array<{ name: string }> };
    };

    expect(report.result.modified.map((change) => change.name)).toEqual(["configs\\system.ltx"]);
    expect(report.result.added.map((change) => change.name)).toEqual(["configs\\weapons\\wpn_added.ltx"]);
  });
});
