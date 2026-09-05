import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox } from "#/xrf-cli/test/sandbox";

describe("gamedata list prefix boundaries", () => {
  const box = new Sandbox(__filename);
  const inputs = ["boundary/configs/kept.ltx", "boundary/configs_backup/kept.ltx"];
  let before: Array<string>;

  beforeAll(() => {
    box.write("boundary/configs/kept.ltx", "[kept]\n");
    box.write("boundary/configs_backup/kept.ltx", "[sibling]\n");
    before = inputs.map((input) => box.sha(input));

    box.run("gamedata list", [
      "--path",
      box.at("boundary"),
      "--source",
      "directory",
      "--prefix",
      "configs",
      "--silent",
      "--report",
      box.at("prefix.json"),
    ]);
    box.run("gamedata list", [
      "--path",
      box.at("boundary"),
      "--source",
      "directory",
      "--ignore",
      "configs",
      "--silent",
      "--report",
      box.at("ignore.json"),
    ]);
    box.run("gamedata list", [
      "--path",
      box.at("boundary"),
      "--source",
      "directory",
      "--prefix",
      "absent",
      "--silent",
      "--report",
      box.at("absent.json"),
    ]);
  });

  it("should apply prefix and ignore at logical component boundaries", () => {
    const prefixed: CommandEnvelope = envelopeAt(box.at("prefix.json"));
    const ignored: CommandEnvelope = envelopeAt(box.at("ignore.json"));
    const boundary = box.at("boundary").replaceAll("\\", "/");

    expect(prefixed.result).toMatchObject({
      total: 1,
      entries: [{ container: boundary, logicalPath: "configs\\kept.ltx" }],
    });
    expect(ignored.result).toMatchObject({
      total: 1,
      entries: [{ container: boundary, logicalPath: "configs_backup\\kept.ltx" }],
    });
  });

  it("should record the boundary and empty selections", () => {
    expect(box.json("prefix.json")).toMatchSnapshot();
    expect(box.json("ignore.json")).toMatchSnapshot();
    expect(box.json("absent.json")).toMatchSnapshot();
  });

  it("should return an empty successful listing for a prefix with no match", () => {
    const absent: CommandEnvelope = envelopeAt(box.at("absent.json"));

    expect(absent.result).toMatchObject({ entries: [], shadowed: [], total: 0 });
  });

  it("should leave authored inputs unchanged", () => {
    expect(inputs.map((input) => box.sha(input))).toEqual(before);
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["prefix.json", "ignore.json", "absent.json"] })).toMatchSnapshot();
  });
});
