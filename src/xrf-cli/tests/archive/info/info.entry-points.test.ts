import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive info entry points", () => {
  const box = new Sandbox(__filename);

  let info: CliResult;
  let unpack: CliResult;

  beforeAll(() => {
    // Distinct authored names let the CLI show two roots without turning this supported case into a shadowing test.
    box.write("configs/config.ltx", "[configs]\n");
    box.write("scripts/script.ltx", "[scripts]\n");
    box.run("archive pack", [
      "--path",
      box.at("configs"),
      "--dest",
      box.at("archives"),
      "--name",
      "configs",
      "--header",
      "entry_point=$fs_root$\\gamedata\\configs\\",
    ]);
    box.run("archive pack", [
      "--path",
      box.at("scripts"),
      "--dest",
      box.at("archives"),
      "--name",
      "scripts",
      "--header",
      "entry_point=$fs_root$\\gamedata\\scripts\\",
    ]);

    info = box.run("archive info", ["--path", box.at("archives"), "--silent", "--report", box.at("info.json")]);
    unpack = box.run("archive unpack", ["--path", box.at("archives"), "--dest", box.at("restored"), "--silent"]);
  });

  it("should report each volume's entry point in a discovered directory", () => {
    const report: CommandEnvelope = envelopeAt(box.at("info.json"));

    expect(info.exitCode).toBe(0);
    expect(report.result).toMatchObject({
      files: 2,
      volumes: [
        { path: expect.stringContaining("configs.db"), root: expect.stringContaining("gamedata/configs") },
        { path: expect.stringContaining("scripts.db"), root: expect.stringContaining("gamedata/scripts") },
      ],
    });
  });

  it("should restore entries under the root each volume declares", () => {
    expect(unpack.exitCode).toBe(0);
    expect(box.text("restored/gamedata/configs/config.ltx")).toEqual(["[configs]"]);
    expect(box.text("restored/gamedata/scripts/script.ltx")).toEqual(["[scripts]"]);
  });

  it("should record the discovered volume roots", () => {
    expect(box.json("info.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["info.json"] })).toMatchSnapshot();
  });
});
