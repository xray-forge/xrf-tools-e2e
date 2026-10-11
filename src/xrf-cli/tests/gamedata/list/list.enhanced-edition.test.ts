import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

// The Enhanced Edition shape: named for its game, with `$fs_root$` and `$app_data_root$` left to the engine.
const FSGAME_COP = [
  "$arch_dir$              = false| false| $fs_root$",
  "$arch_dir_resources$    = false| false| $arch_dir$|         resources\\",
  "$game_data$             = false| true|  $fs_root$|          gamedata\\",
  "$logs$                  = true|  false| $app_data_root$|    logs\\",
  "",
].join("\n");

describe("gamedata list enhanced edition", () => {
  const box = new Sandbox(__filename);
  const inputs = [
    "stage/configs/archive_only.ltx",
    "stage/configs/system.ltx",
    "install/fsgame_cop.ltx",
    "install/gamedata/configs/system.ltx",
  ];
  let before: Array<string>;
  let automatic: CliResult;
  let containing: CliResult;

  beforeAll(() => {
    box.write("stage/configs/archive_only.ltx", "[archive-only]\n");
    box.write("stage/configs/system.ltx", "[archive-system]\n");
    box.write("install/gamedata/configs/system.ltx", "[loose-system]\n");
    box.write("install/fsgame_cop.ltx", FSGAME_COP);
    before = inputs.map((input) => box.sha(input));

    box.run("archive pack", [box.at("stage"), "--dest", box.at("install/resources"), "--name", "configs", "--silent"]);
    automatic = box.run("gamedata list", [
      "--path",
      box.at("install"),
      "--source",
      "auto",
      "--silent",
      "--report",
      box.at("auto.json"),
    ]);
    containing = box.run("gamedata list", [
      "--path",
      box.at("install/gamedata/configs"),
      "--silent",
      "--report",
      box.at("containing.json"),
    ]);
  });

  it("should read an installation declared by its game's fsgame file in auto mode", () => {
    const report: CommandEnvelope = envelopeAt(box.at("auto.json"));

    expect(automatic.exitCode).toBe(0);
    expect(report.result).toMatchObject({
      origin: box.at("install"),
      total: 2,
      entries: [
        {
          container: box.at("install/resources/configs.db").replaceAll("\\", "/"),
          isArchived: true,
          logicalPath: "configs\\archive_only.ltx",
        },
        {
          container: box.at("install/gamedata").replaceAll("\\", "/"),
          isArchived: false,
          logicalPath: "configs\\system.ltx",
        },
      ],
    });
  });

  it("should discover the same installation from a descendant path", () => {
    expect(containing.exitCode).toBe(0);
    expect(envelopeAt(box.at("containing.json")).result).toMatchObject({
      origin: box.at("install/gamedata/configs"),
      total: 2,
    });
  });

  it("should record both results", () => {
    expect(box.json("auto.json")).toMatchSnapshot();
    expect(box.json("containing.json")).toMatchSnapshot();
  });

  it("should leave authored inputs unchanged", () => {
    expect(inputs.map((input) => box.sha(input))).toEqual(before);
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["auto.json", "containing.json"] })).toMatchSnapshot();
  });
});
