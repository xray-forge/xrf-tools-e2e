import { beforeAll, describe, expect, it } from "@jest/globals";

import { ltxSchemes } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

/**
 * What a failed scheme verification reports to a machine.
 *
 * @remarks
 * The sibling report suite records a run that found nothing, which cannot say what a finding looks
 * like on the wire. Every finding here is an `LtxScheme` carrying its section, field, message and
 * location, and the counts beside them are what a caller reads to tell an unverified tree from a
 * verified one that failed.
 */
describe("ltx verify schemes report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("ltx verify", ["--path", ltxSchemes("configs"), "--silent", "--report", box.at("report.json")], {
      expectExit: 3,
    });
  });

  it("should report every finding and the coverage it reached", () => {
    expect(box.json("report.json")).toMatchSnapshot();
  });

  it("should separate the sections that passed from the ones that failed", () => {
    const report = box.json("report.json") as {
      result: { checkedSections: number; invalidSections: number; skippedSections: number; validSections: number };
    };

    // Three pass, four fail, one is untyped: a total alone would let a tree that verifies nothing read
    // like a tree that verifies cleanly.
    expect(report.result).toMatchObject({
      checkedSections: 7,
      invalidSections: 4,
      skippedSections: 1,
      validSections: 3,
    });
  });
});
