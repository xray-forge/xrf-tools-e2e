import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";
import { GROUP_THUMBNAIL, OBJECT_THUMBNAIL, SOUND_THUMBNAIL, writeThumbnail } from "#/xrf-cli/test/thumbnails";

describe("thm info of other thumbnail kinds", () => {
  const box = new Sandbox(__filename);

  let object: CliResult;
  let group: CliResult;
  let sound: CliResult;

  beforeAll(() => {
    object = box.run("thm info", [
      writeThumbnail(box.at("crate.thm"), OBJECT_THUMBNAIL),
      "--report",
      box.at("object.json"),
    ]);
    group = box.run("thm info", [
      writeThumbnail(box.at("forest.thm"), GROUP_THUMBNAIL),
      "--report",
      box.at("group.json"),
    ]);
    sound = box.run("thm info", [
      writeThumbnail(box.at("door.thm"), SOUND_THUMBNAIL),
      "--report",
      box.at("sound.json"),
    ]);
  });

  it("should print an object's size and preview", () => {
    expect(object).toMatchSnapshot();
    expect(box.json("object.json")).toMatchObject({ result: { kind: "object" } });
  });

  // A group is stamped with the object type; only its version tells it apart.
  it("should tell a group from the object type it carries and list its objects", () => {
    expect(group).toMatchSnapshot();
    expect(box.json("group.json")).toMatchObject({ result: { kind: "group" } });
  });

  it("should print a sound's parameters", () => {
    expect(sound).toMatchSnapshot();
    expect(box.json("sound.json")).toMatchObject({ result: { kind: "sound" } });
  });

  it("should report each thumbnail as its reader reads it", () => {
    expect([box.json("object.json"), box.json("group.json"), box.json("sound.json")]).toMatchSnapshot();
  });

  it("should leave the thumbnails as they were and write only the reports", () => {
    expect(box.manifest({ normalized: ["object.json", "group.json", "sound.json"] })).toMatchSnapshot();
  });
});
