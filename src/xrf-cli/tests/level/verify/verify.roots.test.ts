import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Reading a level named by an installation rather than by a path.
 */
describe("level verify roots", () => {
  const box = new Sandbox(__filename);

  let loose: CliResult;
  let unnamed: CliResult;
  let unknown: CliResult;
  let notALevel: CliResult;
  let levelWithoutRoot: CliResult;

  beforeAll(() => {
    // A root the game would mount: levels beneath `levels`, named as the engine knows them.
    box.copyIn(resource("levels/triangle"), "root/levels/triangle");
    box.copyIn(resource("levels/sectors"), "root/levels/zaton");

    // A directory of lightmaps alone carries no bundle, so it is not a level however it is named.
    fs.mkdirSync(box.at("root/levels/not_a_level"), { recursive: true });
    box.write("root/levels/not_a_level/lmap#1_1.dds", "picture");

    box.run("archive pack", [box.at("root"), "--dest", box.at("packed"), "--name", "levels"]);

    loose = box.run("level verify", [
      "--root",
      box.at("root"),
      "--level",
      "triangle",
      "--source",
      "directory",
      "--report",
      box.at("loose.json"),
    ]);
    box.run("level verify", [
      "--root",
      box.at("packed"),
      "--level",
      "triangle",
      "--source",
      "volumes",
      "--report",
      box.at("archived.json"),
    ]);

    unnamed = box.run("level verify", ["--root", box.at("root"), "--source", "directory"], { expectExit: 1 });
    unknown = box.run("level verify", ["--root", box.at("root"), "--level", "pripyat", "--source", "directory"], {
      expectExit: 1,
    });
    notALevel = box.run("level verify", ["--root", box.at("root"), "--level", "not_a_level", "--source", "directory"], {
      expectExit: 1,
    });
    levelWithoutRoot = box.run("level verify", ["--level", "triangle"], { expectExit: 2 });
  });

  it("should read a level of mounted roots by its name", () => {
    expect(envelopeAt(box.at("loose.json"))).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: { status: "passed" },
    });
    expect(loose.stdout).toEqual(expect.arrayContaining(["Verifying compiled level levels\\triangle"]));
    expect(loose).toMatchSnapshot();
  });

  it("should read the same level out of an archive volume", () => {
    expect(envelopeAt(box.at("archived.json"))).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: { status: "passed" },
    });
  });

  // The point of the archived lane: a level with no directory to point at reads identically to one that has.
  it("should reach the same verdict archived as loose", () => {
    const looseResult = (envelopeAt(box.at("loose.json")) as { result: unknown }).result;
    const archivedResult = (envelopeAt(box.at("archived.json")) as { result: unknown }).result;

    expect(archivedResult).toEqual(looseResult);
  });

  it("should name every level the roots hold when none was chosen", () => {
    expect(unnamed.stderr.join("\n")).toContain("triangle");
    expect(unnamed.stderr.join("\n")).toContain("zaton");
    expect(unnamed.stderr.join("\n")).not.toContain("not_a_level");
    expect(unnamed).toMatchSnapshot();
  });

  it("should refuse a name no level answers to", () => {
    expect(unknown).toMatchSnapshot();
  });

  it("should refuse a directory that carries no bundle", () => {
    expect(notALevel).toMatchSnapshot();
  });

  it("should refuse a level name without roots to look in", () => {
    expect(levelWithoutRoot).toMatchSnapshot();
  });

  it("should preserve fixture bytes and write only the requested reports", () => {
    expect(box.manifest({ normalized: ["loose.json", "archived.json"] })).toMatchSnapshot();
  });
});
