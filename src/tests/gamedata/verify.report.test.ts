import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { envelopeAt, type CommandEnvelope } from "#/test/envelope";
import { Sandbox, type CliResult } from "#/test/sandbox";

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
  });

  // `--silent` mutes the progress story but never failures, so the run still reports its findings
  // and the final verdict line.
  it("should answer non-zero and report only the failure story", () => {
    expect(verify).toMatchSnapshot();
  });

  // The report carries every finding, so it is compared as a single hash over normalized content.
  // When it moves, the report in target/ is what to read.
  it("should write a findings report", () => {
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
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
