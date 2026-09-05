import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox } from "#/xrf-cli/test/sandbox";

describe("gamedata list repeated roots", () => {
  const box = new Sandbox(__filename);
  const inputs = [
    "base/configs/base.ltx",
    "base/configs/system.ltx",
    "override/configs/override.ltx",
    "override/configs/system.ltx",
  ];
  let before: Array<string>;

  beforeAll(() => {
    box.write("base/configs/base.ltx", "[base-only]\n");
    box.write("base/configs/system.ltx", "[base]\n");
    box.write("override/configs/override.ltx", "[override-only]\n");
    box.write("override/configs/system.ltx", "[override]\n");
    before = inputs.map((input) => box.sha(input));

    box.run("gamedata list", [
      "--path",
      box.at("base"),
      "--path",
      box.at("override"),
      "--source",
      "directory",
      "--shadowed",
      "--silent",
      "--report",
      box.at("overlay.json"),
    ]);
  });

  it("should preserve the first repeated directory root as the winning source", () => {
    const report: CommandEnvelope = envelopeAt(box.at("overlay.json"));
    const base = box.at("base").replaceAll("\\", "/");
    const override = box.at("override").replaceAll("\\", "/");

    expect(report.result).toMatchObject({
      isShadowedIncluded: true,
      total: 3,
      entries: [
        { container: base, isArchived: false, logicalPath: "configs\\base.ltx" },
        { container: override, isArchived: false, logicalPath: "configs\\override.ltx" },
        { container: base, isArchived: false, logicalPath: "configs\\system.ltx" },
      ],
      shadowed: [{ container: override, isArchived: false, logicalPath: "configs\\system.ltx" }],
    });
  });

  it("should record the resolved roots", () => {
    expect(box.json("overlay.json")).toMatchSnapshot();
  });

  it("should leave authored inputs unchanged", () => {
    expect(inputs.map((input) => box.sha(input))).toEqual(before);
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["overlay.json"] })).toMatchSnapshot();
  });
});
