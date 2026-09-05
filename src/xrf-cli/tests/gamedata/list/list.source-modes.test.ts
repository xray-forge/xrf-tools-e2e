import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const FSGAME = [
  "$arch_dir$ = false| false| $fs_root$| database\\",
  "$game_data$ = true| true| $fs_root$| gamedata\\",
  "",
].join("\n");

describe("gamedata list source modes", () => {
  const box = new Sandbox(__filename);
  const inputs = [
    "stage/configs/archive_only.ltx",
    "stage/configs/system.ltx",
    "install/fsgame.ltx",
    "install/gamedata/configs/system.ltx",
  ];
  let before: Array<string>;
  let automatic: CliResult;
  let installation: CliResult;
  let directory: CliResult;
  let automaticVolumes: CliResult;
  let volumes: CliResult;
  let packedHash: string;

  beforeAll(() => {
    box.write("stage/configs/archive_only.ltx", "[archive-only]\n");
    box.write("stage/configs/system.ltx", "[archive-system]\n");
    box.write("install/gamedata/configs/system.ltx", "[loose-system]\n");
    box.write("install/fsgame.ltx", FSGAME);
    before = inputs.map((input) => box.sha(input));

    box.run("archive pack", [
      "--path",
      box.at("stage"),
      "--dest",
      box.at("install/database"),
      "--name",
      "gamedata",
      "--silent",
    ]);
    packedHash = box.sha("install/database/gamedata.db");
    automatic = box.run("gamedata list", [
      "--path",
      box.at("install"),
      "--source",
      "auto",
      "--silent",
      "--report",
      box.at("auto-install.json"),
    ]);
    installation = box.run("gamedata list", [
      "--path",
      box.at("install"),
      "--source",
      "installation",
      "--silent",
      "--report",
      box.at("installation.json"),
    ]);
    directory = box.run("gamedata list", [
      "--path",
      box.at("install"),
      "--source",
      "directory",
      "--silent",
      "--report",
      box.at("directory.json"),
    ]);
    automaticVolumes = box.run("gamedata list", [
      "--path",
      box.at("install/database"),
      "--source",
      "auto",
      "--silent",
      "--report",
      box.at("auto-volumes.json"),
    ]);
    volumes = box.run("gamedata list", [
      "--path",
      box.at("install/database"),
      "--source",
      "volumes",
      "--silent",
      "--report",
      box.at("volumes.json"),
    ]);
  });

  it("should treat an installation as its declared loose and archive sources in auto and installation modes", () => {
    const report: CommandEnvelope = envelopeAt(box.at("auto-install.json"));
    const archive = box.at("install/database").replaceAll("\\", "/");
    const loose = box.at("install/gamedata").replaceAll("\\", "/");

    expect(automatic.exitCode).toBe(0);
    expect(installation.exitCode).toBe(0);
    expect(report.result).toMatchObject({
      origin: box.at("install"),
      total: 2,
      entries: [
        { container: archive, isArchived: true, logicalPath: "configs\\archive_only.ltx" },
        { container: loose, isArchived: false, logicalPath: "configs\\system.ltx" },
      ],
    });
    expect(box.json("installation.json")).toEqual(box.json("auto-install.json"));
  });

  it("should treat the same installation path as one loose tree in directory mode", () => {
    const report: CommandEnvelope = envelopeAt(box.at("directory.json"));
    const install = box.at("install").replaceAll("\\", "/");

    expect(directory.exitCode).toBe(0);
    expect(report.result).toMatchObject({
      origin: box.at("install"),
      total: 3,
      entries: [
        { container: install, isArchived: false, logicalPath: "database\\gamedata.db" },
        { container: install, isArchived: false, logicalPath: "fsgame.ltx" },
        { container: install, isArchived: false, logicalPath: "gamedata\\configs\\system.ltx" },
      ],
    });
  });

  it("should recognize a named volume directory in auto mode and enumerate it in volumes mode", () => {
    const report: CommandEnvelope = envelopeAt(box.at("auto-volumes.json"));
    const archive = box.at("install/database").replaceAll("\\", "/");

    expect(automaticVolumes.exitCode).toBe(0);
    expect(volumes.exitCode).toBe(0);
    expect(report.result).toMatchObject({
      origin: box.at("install/database"),
      total: 2,
      entries: [
        { container: archive, isArchived: true, logicalPath: "configs\\archive_only.ltx" },
        { container: archive, isArchived: true, logicalPath: "configs\\system.ltx" },
      ],
    });
    // Explicit volume discovery mounts each archive file; auto discovery mounts the containing volume directory.
    expect(box.json("volumes.json")).toMatchObject({
      result: {
        origin: "<sandbox>/install/database",
        total: 2,
        entries: [
          {
            container: "<sandbox>/install/database/gamedata.db",
            isArchived: true,
            logicalPath: "configs\\archive_only.ltx",
          },
          { container: "<sandbox>/install/database/gamedata.db", isArchived: true, logicalPath: "configs\\system.ltx" },
        ],
        shadowed: [],
      },
    });
  });

  it("should record every supported source-mode result", () => {
    expect(box.json("auto-install.json")).toMatchSnapshot();
    expect(box.json("installation.json")).toMatchSnapshot();
    expect(box.json("directory.json")).toMatchSnapshot();
    expect(box.json("auto-volumes.json")).toMatchSnapshot();
    expect(box.json("volumes.json")).toMatchSnapshot();
  });

  it("should leave authored inputs unchanged", () => {
    expect(inputs.map((input) => box.sha(input))).toEqual(before);
    expect(box.sha("install/database/gamedata.db")).toBe(packedHash);
  });

  it("should write the expected files", () => {
    expect(
      box.manifest({
        normalized: ["auto-install.json", "installation.json", "directory.json", "auto-volumes.json", "volumes.json"],
      })
    ).toMatchSnapshot();
  });
});
