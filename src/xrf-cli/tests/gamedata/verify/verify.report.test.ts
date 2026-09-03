import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("gamedata verify full run", () => {
  const box = new Sandbox(__filename);

  let verify: CliResult;

  beforeAll(() => {
    // The committed tree carries deliberate problems: configs in vanilla rather than formatter
    // shape, visuals and particle effects referencing textures the trimmed tree does not ship. A
    // non-zero answer with a known set of findings is therefore the correct result, and it is what
    // makes this a real check rather than a tree with nothing to say.
    verify = box.run("gamedata verify", [gamedata(), "--silent", "--report", box.at("report.json")], {
      expectExit: 3,
    });

    // One check's worth of the same document, small enough to read. The tree ships no scripts, so
    // this one passes with nothing to say and the shape is all that is left.
    box.run("gamedata verify", [gamedata(), "--checks", "scripts", "--silent", "--report", box.at("scripts.json")]);
  });

  // `--silent` mutes the progress story but never failures, so the run still reports its findings
  // and the final verdict line.
  it("should answer non-zero and report only the failure story", () => {
    expect(verify).toMatchSnapshot();
  });

  // The full run's report is thousands of lines, too large to read in a diff, so its completeness is
  // held by one hash over normalized content: when it moves, the sandbox under target/e2e-cli/ is what to read.
  // The document's shape is pinned separately, below, where it can be read.
  it("should write a findings report", () => {
    expect(box.manifest({ normalized: ["report.json", "scripts.json"] })).toMatchSnapshot();
  });

  // The same document at a size a reviewer can hold: every field, name and nesting level of the
  // report reaches the diff, so a change to the reported shape is readable rather than merely
  // detected. What the full run adds is volume, not structure.
  it("should report one check as a readable document", () => {
    expect(box.json("scripts.json")).toMatchSnapshot();
  });

  // A failing check still reports the findings that explain its verdict, which is the requirement
  // the generic contract exists for. The envelope itself is pinned in `cli/reporting`.
  it("should carry its findings under the envelope result even though the check failed", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("report.json"));

    expect(envelope.command).toEqual(["gamedata", "verify"]);
    expect(envelope.outcome).toBe("checkFailed");
    expect(envelope.exitCode).toBe(3);
    expect(JSON.stringify(envelope.result)).toContain("checks");
  });
});
