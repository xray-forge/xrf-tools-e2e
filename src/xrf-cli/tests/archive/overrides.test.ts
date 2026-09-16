import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What a person is told when one volume set answers an engine path twice over.
 *
 * @remarks
 * Two spellings of one name cannot share a directory on a case-insensitive filesystem, so they are authored in separate
 * trees and meet only inside the volume set - which is how a case-only duplicate reaches a player's install in the
 * first place, as a patch volume built elsewhere.
 */
describe("volume set overrides", () => {
  const box = new Sandbox(__filename);
  const logicalPath = "textures\\wpn\\wpn_ak74.dds";

  let verified: CliResult;

  beforeAll(() => {
    box.write("base/textures/wpn/wpn_ak74.dds", "base texture");
    box.write("patch/Textures/Wpn/WPN_AK74.DDS", "patched texture");

    box.run("archive pack", [box.at("base"), "--dest", box.at("db"), "--name", "base"]);
    box.run("archive pack", [box.at("patch"), "--dest", box.at("db"), "--name", "patch"]);

    verified = box.run("archive verify", ["--path", box.at("db"), "--report", box.at("verify.json")]);
    // `auto` mounts the directory as one volume set, which is the shape `archive verify` reads and the application
    // opens. `volumes` would mount each file as its own source, where the pair is shadowing between mounts instead.
    box.run("gamedata list", [
      "--path",
      box.at("db"),
      "--source",
      "auto",
      "--shadowed",
      "--report",
      box.at("listing.json"),
    ]);
  });

  it("should verify clean and still name what the patch buried", () => {
    expect(verified.exitCode).toBe(0);
    expect(verified).toMatchSnapshot();
  });

  it("should report the overridden path beside the verdict, and nothing as unreachable", () => {
    expect(box.json("verify.json")).toMatchObject({
      outcome: "success",
      result: {
        checked: 2,
        collisions: [],
        findings: [],
        overrides: [
          {
            container: "<sandbox>/db/patch.db",
            hidden: ["<sandbox>/db/base.db"],
            logicalPath,
          },
        ],
        status: "passed",
      },
    });
    expect(box.json("verify.json")).toMatchSnapshot();
  });

  it("should report the same buried copy from the listing", () => {
    expect(box.json("listing.json")).toMatchObject({
      result: {
        collisions: [],
        entries: [{ isArchived: true, logicalPath }],
        shadowed: [{ container: "<sandbox>/db/base.db", isArchived: true, logicalPath }],
        total: 1,
      },
    });
    expect(box.json("listing.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["verify.json", "listing.json"] })).toMatchSnapshot();
  });
});
