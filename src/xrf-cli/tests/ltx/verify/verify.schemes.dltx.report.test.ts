import { beforeAll, describe, expect, it } from "@jest/globals";

import { ltxSchemesDltx } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

/**
 * What each dialect reports to a machine for a tree whose patch breaks a scheme.
 *
 * @remarks
 * The two documents are the whole argument for the flag: standard rules deposit one `Verify` finding
 * about a file they could not read and count the weapon as valid, the dialect deposits two
 * `LtxScheme` findings against the section the game would actually load.
 */
describe("ltx verify schemes --dltx report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    box.run("ltx verify", ["--path", ltxSchemesDltx("configs"), "--silent", "--report", box.at("standard.json")], {
      expectExit: 3,
    });
    box.run(
      "ltx verify",
      ["--path", ltxSchemesDltx("configs"), "--dltx", "--silent", "--report", box.at("dltx.json")],
      { expectExit: 3 }
    );
  });

  it("should report a valid section and an unreadable patch under standard rules", () => {
    expect(box.json("standard.json")).toMatchSnapshot();
  });

  it("should report the scheme findings the dialect uncovered", () => {
    expect(box.json("dltx.json")).toMatchSnapshot();
  });

  it("should reverse the verdict on the same section", () => {
    const standard = box.json("standard.json") as { result: { invalidSections: number; validSections: number } };
    const dltx = box.json("dltx.json") as { result: { invalidSections: number; validSections: number } };

    expect(standard.result).toMatchObject({ invalidSections: 0, validSections: 1 });
    expect(dltx.result).toMatchObject({ invalidSections: 1, validSections: 0 });
  });
});
