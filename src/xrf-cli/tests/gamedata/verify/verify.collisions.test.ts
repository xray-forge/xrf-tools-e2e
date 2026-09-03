import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

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

  beforeAll(() => {
    // Formatter-shaped, CRLF included, so the selected check passes and the failing verdict can only come from
    // the project's own inputs.
    box.write("gamedata/configs/system.ltx", "[section]\r\nvalue = 1\r\n");
    box.write("gamedata/textures/k.dds", "");
    box.write(`gamedata/${KELVIN_TEXTURE}`, "");

    // Deliberately a check that has nothing to do with textures: a narrow selection must not hide a file the game
    // cannot load, which is the whole point of judging reachability beside the selection rather than inside it.
    verify = box.run("gamedata verify", [box.at("gamedata"), "--checks", "ltx", "--report", box.at("report.json")], {
      expectExit: 3,
    });
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

  it("should write only its report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
