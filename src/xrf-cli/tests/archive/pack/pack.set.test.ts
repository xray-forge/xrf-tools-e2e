import { beforeAll, describe, expect, it } from "@jest/globals";

import type { Optional } from "#/types";
import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * One target of a set, as far as this suite reads a report back.
 */
interface ISetTargetResult {
  name: string;
  result: { filesTotal: number; filesCompressed: number; filesStored: number; sizeWritten: number };
}

/**
 * What a set run says it produced.
 */
interface ISetResult {
  targets: Array<ISetTargetResult>;
  filesTotal: number;
  volumesTotal: number;
  unclaimed: number;
}

/**
 * The shared header both formats write, spelled the way each of them spells it.
 */
const HEADER_ENTRIES: Array<{ key: string; value: string }> = [
  { key: "auto_load", value: "true" },
  { key: "entry_point", value: "$fs_root$gamedata\\" },
];

/**
 * A set is targets sharing one source and one destination, each producing its own archive.
 *
 * Both configuration formats carry one: LTX by suffixing a section with the target's name, JSON by a `targets` map
 * over an optional `defaults` block. The two are serializations of one payload, so the archives they produce have to
 * be the same bytes target for target. Selections are disjoint by construction here — one target packs `configs` and
 * the other `meshes` — because two targets claiming one file is refused rather than packed twice.
 */
describe("archive pack set", () => {
  const box = new Sandbox(__filename);

  let fromLtx: CliResult;
  let fromJson: CliResult;
  let selected: CliResult;
  let unknownTarget: CliResult;
  let namedBesideSet: CliResult;
  let modeFromFile: CliResult;
  let modeFromFlag: CliResult;
  let ownedEmptyExclusions: CliResult;
  let listedConfigs: CliResult;
  let listedMeshes: CliResult;

  beforeAll(() => {
    const ltx: string = box.write(
      "set.ltx",
      [
        "[options]",
        "exclude_exts = *.xml",
        "",
        "[header]",
        ...HEADER_ENTRIES.map((entry) => `${entry.key} = ${entry.value}`),
        "",
        "[include_folders.configs]",
        "configs = true",
        "",
        "[include_folders.meshes]",
        "meshes = true",
        "",
      ].join("\n")
    );

    // The same set in the other serialization: shared rules in `defaults`, one entry per target in `targets`.
    const json: string = box.write(
      "set.json",
      JSON.stringify(
        {
          defaults: { excludeExtensions: ["*.xml"], header: HEADER_ENTRIES },
          targets: {
            configs: { includeDirectories: [{ path: "configs", isRecursive: true }] },
            meshes: { includeDirectories: [{ path: "meshes", isRecursive: true }] },
          },
        },
        null,
        2
      )
    );

    fromLtx = box.run("archive pack", [
      gamedata(),
      "--dest",
      box.at("ltx"),
      "--config",
      ltx,
      "--report",
      box.at("set.report.json"),
    ]);
    fromJson = box.run("archive pack", [gamedata(), "--dest", box.at("json"), "--config", json]);

    // Naming a target packs that archive alone, which is what replaced the engine build's own include switch.
    selected = box.run("archive pack", [gamedata(), "--dest", box.at("one"), "--config", ltx, "--target", "meshes"]);

    unknownTarget = box.run(
      "archive pack",
      [gamedata(), "--dest", box.at("unknown-target"), "--config", ltx, "--target", "textures"],
      { expectExit: 1 }
    );
    // A set file names its own archives, so a run naming one more has said two different things.
    namedBesideSet = box.run(
      "archive pack",
      [gamedata(), "--dest", box.at("named"), "--config", ltx, "--name", "everything"],
      { expectExit: 1 }
    );

    // `configs` is the target whose payload the compressor actually shrinks; meshes are stored under either mode, so
    // an override there would prove nothing about which of the file and the flag won.
    const modes: string = box.write(
      "modes.ltx",
      [
        "[options.configs]",
        "mode = store",
        "",
        "[include_folders.configs]",
        "configs = true",
        "",
        "[include_folders.meshes]",
        "meshes = true",
        "",
      ].join("\n")
    );

    modeFromFile = box.run("archive pack", [
      gamedata(),
      "--dest",
      box.at("stored"),
      "--config",
      modes,
      "--report",
      box.at("stored.report.json"),
    ]);
    modeFromFlag = box.run("archive pack", [
      gamedata(),
      "--dest",
      box.at("compressed"),
      "--config",
      modes,
      "--mode",
      "compress",
      "--report",
      box.at("compressed.report.json"),
    ]);

    // A section present but empty is owned and empty: `meshes` keeps what the shared exclusion drops, while `configs`
    // never claims the section and takes the defaults.
    const exclusions: string = box.write(
      "exclusions.ltx",
      [
        "[exclude_folders]",
        "configs\\text = true",
        "meshes\\omf = true",
        "",
        "[include_folders.configs]",
        "configs = true",
        "",
        "[include_folders.meshes]",
        "meshes = true",
        "",
        "[exclude_folders.meshes]",
        "",
      ].join("\n")
    );

    ownedEmptyExclusions = box.run("archive pack", [
      gamedata(),
      "--dest",
      box.at("exclusions"),
      "--config",
      exclusions,
      "--report",
      box.at("exclusions.report.json"),
    ]);

    listedConfigs = box.run("archive list", ["--path", box.at("exclusions/configs.db"), "--files"]);
    listedMeshes = box.run("archive list", ["--path", box.at("exclusions/meshes.db"), "--files"]);
  });

  it("should pack one archive per target from an LTX set", () => {
    expect(fromLtx).toMatchSnapshot();
  });

  it("should pack the same set written as a document", () => {
    expect(fromJson).toMatchSnapshot();
  });

  // Two serializations of one payload have to select the same files for every target, which identical bytes prove.
  it("should produce the same archive from either format for every target", () => {
    for (const name of ["configs", "meshes"]) {
      expect(box.sha(`json/${name}.db`)).toBe(box.sha(`ltx/${name}.db`));
    }
  });

  it("should report each target by name beside the totals it was folded into", () => {
    const result: ISetResult = envelopeAt(box.at("set.report.json")).result as ISetResult;

    expect(result.targets.map((target) => target.name)).toEqual(["configs", "meshes"]);
    expect(result.volumesTotal).toBe(2);
    expect(result.filesTotal).toBe(result.targets.reduce((total, target) => total + target.result.filesTotal, 0));
    // Everything the fixture tree holds outside the two packed directories, counted once each.
    expect(result.unclaimed).toBeGreaterThan(0);
    expect(box.json("set.report.json")).toMatchSnapshot();
  });

  it("should pack only the named target", () => {
    expect(selected).toMatchSnapshot();
    expect(box.manifest().filter((file) => file.path.startsWith("one/"))).toEqual([
      expect.objectContaining({ path: "one/meshes.db" }),
    ]);
    expect(box.sha("one/meshes.db")).toBe(box.sha("ltx/meshes.db"));
  });

  it("should refuse a target the set does not name", () => {
    expect(unknownTarget).toMatchSnapshot();
    expect(unknownTarget.stderr.join("\n")).toContain("configs, meshes");
  });

  it("should refuse a volume name beside a set that names its own", () => {
    expect(namedBesideSet).toMatchSnapshot();
  });

  // Precedence is file over caller, then flags over file: the run's own word is the last one applied.
  it("should let a run mode override the one the file claims", () => {
    const stored: ISetResult = envelopeAt(box.at("stored.report.json")).result as ISetResult;
    const compressed: ISetResult = envelopeAt(box.at("compressed.report.json")).result as ISetResult;
    const configsOf = (result: ISetResult): ISetTargetResult["result"] => {
      const target: Optional<ISetTargetResult> = result.targets.find((entry) => entry.name === "configs");

      if (target === undefined) {
        throw new Error("The set reported no 'configs' target.");
      }

      return target.result;
    };

    expect(modeFromFile.exitCode).toBe(0);
    expect(modeFromFlag.exitCode).toBe(0);
    expect(configsOf(stored).filesCompressed).toBe(0);
    expect(configsOf(stored).filesStored).toBeGreaterThan(0);
    expect(configsOf(compressed).filesStored).toBe(0);
    expect(configsOf(compressed).filesCompressed).toBe(configsOf(stored).filesStored);
    expect(configsOf(compressed).sizeWritten).toBeLessThan(configsOf(stored).sizeWritten);
  });

  it("should honour an owned empty exclusion section over the shared one", () => {
    const result: ISetResult = envelopeAt(box.at("exclusions.report.json")).result as ISetResult;

    expect(ownedEmptyExclusions).toMatchSnapshot();
    expect(result.targets.map((target) => target.name)).toEqual(["configs", "meshes"]);
    // The target owning an empty section excludes nothing at all.
    expect(listedMeshes.stdout.some((line) => line.startsWith("meshes\\omf\\"))).toBe(true);
    // The target claiming no section of its own takes the shared exclusion.
    expect(listedConfigs.stdout.some((line) => line.startsWith("configs\\text\\"))).toBe(false);
  });

  it("should write the expected files", () => {
    expect(
      box.manifest({
        normalized: ["set.report.json", "stored.report.json", "compressed.report.json", "exclusions.report.json"],
      })
    ).toMatchSnapshot();
  });
});
