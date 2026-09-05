import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

/**
 * A file whose name folds onto `k.dds` for the engine while the host keeps the two apart.
 *
 * @remarks
 * The engine lower-cases a name before looking it up, so two files of one source can normalize onto a single identity
 * and leave one of them unreachable. The obvious pair is `a.dds` beside `A.dds`, which needs a case-sensitive
 * filesystem to exist at all. U+212A KELVIN SIGN lower-cases to `k` in Unicode but is its own letter to NTFS, so the
 * pair below is two files on every platform the suite runs on and one identity to the engine on all of them.
 */
const KELVIN_TEXTURE = "textures/K.dds";

describe("gamedata verify meets unreachable files", () => {
  const box = new Sandbox(__filename);

  let verify: CliResult;
  let emptyCheck: CliResult;
  let clean: CliResult;
  let inputs: Array<ManifestFile>;

  beforeAll(() => {
    // Formatter-shaped, CRLF included, so the selected check passes and the failing verdict can only come from
    // the project's own inputs.
    box.write("gamedata/configs/system.ltx", "[section]\r\nvalue = 1\r\n");
    box.write("gamedata/textures/k.dds", "");
    box.write(`gamedata/${KELVIN_TEXTURE}`, "");
    box.write("clean/configs/system.ltx", "[section]\r\nvalue = 1\r\n");
    box.write("clean/textures/k.dds", "");
    inputs = box.manifest();

    // Deliberately a check that has nothing to do with textures: a narrow selection must not hide a file the game
    // cannot load, which is the whole point of judging reachability beside the selection rather than inside it.
    verify = box.run("gamedata verify", [box.at("gamedata"), "--checks", "ltx", "--report", box.at("report.json")], {
      expectExit: 3,
    });
    emptyCheck = box.run(
      "gamedata verify",
      [box.at("gamedata"), "--checks", "scripts", "--report", box.at("empty-check.json")],
      { expectExit: 3 }
    );
    clean = box.run("gamedata verify", [box.at("clean"), "--checks", "scripts", "--report", box.at("clean.json")]);
  });

  // Both host paths, because either one alone leaves the reader unable to tell which file to remove or rename.
  it("should answer non-zero and name both files", () => {
    expect(verify).toMatchSnapshot();
  });

  it("should carry the collision as its own check", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

    expect(envelope.outcome).toBe("checkFailed");
    expect(envelope.exitCode).toBe(3);
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should retain unreachable paths when the selected check is empty", () => {
    expect(emptyCheck.exitCode).toBe(3);
    expect(box.json("empty-check.json")).toMatchObject({
      exitCode: 3,
      outcome: "checkFailed",
      result: {
        status: "failed",
        checks: [
          { verificationType: "coverage", status: "skipped", findings: [] },
          {
            verificationType: "collisions",
            status: "failed",
            findings: [{ ruleId: "collisions.unreachable", assetPath: "textures/k.dds" }],
          },
          { verificationType: "scripts", status: "passed", findings: [] },
        ],
      },
    });
  });

  it("should pass after removing only the colliding sibling", () => {
    expect(clean.exitCode).toBe(0);
    expect(box.json("clean.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        status: "passed",
        checks: [
          { verificationType: "coverage", status: "skipped", findings: [] },
          { verificationType: "collisions", status: "skipped", findings: [] },
          { verificationType: "scripts", status: "passed", findings: [] },
        ],
      },
    });
  });

  it("should preserve its inputs and write readable reports", () => {
    expect(
      box.manifest().filter((file) => !["report.json", "empty-check.json", "clean.json"].includes(file.path))
    ).toEqual(inputs);
    expect(box.json("empty-check.json")).toMatchSnapshot();
    expect(box.json("clean.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["report.json", "empty-check.json", "clean.json"] })).toMatchSnapshot();
  });
});
