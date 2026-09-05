import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox } from "#/xrf-cli/test/sandbox";

const FSGAME = "$game_data$ = true| true| $fs_root$| gamedata\\\n";

describe("gamedata list containing installation", () => {
  const box = new Sandbox(__filename);
  const inputs = ["install/fsgame.ltx", "install/gamedata/configs/installed.ltx"];
  let before: Array<string>;

  beforeAll(() => {
    box.write("install/gamedata/configs/installed.ltx", "[installed]\n");
    box.write("install/fsgame.ltx", FSGAME);
    before = inputs.map((input) => box.sha(input));

    box.run("gamedata list", [
      "--path",
      box.at("install/gamedata/configs"),
      "--silent",
      "--report",
      box.at("containing.json"),
    ]);
  });

  it("should discover an installation from a descendant path", () => {
    const report: CommandEnvelope = envelopeAt(box.at("containing.json"));

    expect(report.result).toMatchObject({
      total: 1,
      entries: [
        {
          container: box.at("install/gamedata").replaceAll("\\", "/"),
          isArchived: false,
          logicalPath: "configs\\installed.ltx",
        },
      ],
      origin: box.at("install/gamedata/configs"),
    });
  });

  it("should record the discovered installation", () => {
    expect(box.json("containing.json")).toMatchSnapshot();
  });

  it("should leave authored inputs unchanged", () => {
    expect(inputs.map((input) => box.sha(input))).toEqual(before);
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["containing.json"] })).toMatchSnapshot();
  });
});
