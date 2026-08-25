import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
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
});
