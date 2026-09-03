import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What a person is told when a volume set holds entries the engine cannot reach.
 *
 * @remarks
 * Two spellings of one name cannot share a directory on a case-insensitive filesystem, so they are authored in separate
 * trees and meet only inside the volume set - which is how a case-only duplicate reaches a player's install in the
 * first place, as a patch volume built elsewhere.
 */
describe("volume set reachability", () => {
  const box = new Sandbox(__filename);

  let verified: CliResult;
  let listed: CliResult;

  beforeAll(() => {
    box.write("base/textures/wpn/wpn_ak74.dds", "base texture");
    box.write("patch/Textures/Wpn/WPN_AK74.DDS", "patched texture");

    box.run("archive pack", ["--path", box.at("base"), "--dest", box.at("db"), "--name", "base"]);
    box.run("archive pack", ["--path", box.at("patch"), "--dest", box.at("db"), "--name", "patch"]);

    verified = box.run("archive verify", ["--path", box.at("db"), "--report", box.at("verify.json")]);
    // `auto` mounts the directory as one volume set, which is the shape `archive verify` reads and the application
    // opens. `volumes` would mount each file as its own source, where the pair is legitimate shadowing between mounts
    // rather than an unreachable entry inside one.
    listed = box.run("gamedata list", ["--path", box.at("db"), "--source", "auto", "--report", box.at("listing.json")]);
  });

  it("should verify clean and still name what no lookup can reach", () => {
    // Payload integrity and reachability are different questions: every entry here decompresses and matches its CRC,
    // and one of them is still unreachable.
    expect(verified.exitCode).toBe(0);
    expect(verified).toMatchSnapshot();
  });

  it("should report the unreachable entry beside the verdict", () => {
    expect(box.json("verify.json")).toMatchSnapshot();
  });

  it("should report the same collision from the listing", () => {
    // One record, one shape, whichever surface answers: the listing and the verdict report the same entry with the
    // same fields.
    expect(box.json("listing.json")).toMatchSnapshot();
    expect(listed.stderr).toEqual(expect.arrayContaining(verified.stderr));
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["verify.json", "listing.json"] })).toMatchSnapshot();
  });
});
