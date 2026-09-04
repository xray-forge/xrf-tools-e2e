import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedataDltx } from "#/xrf-cli/test/constants";
import { Sandbox } from "#/xrf-cli/test/sandbox";

/**
 * What each dialect reports to a machine for the same config tree.
 *
 * @remarks
 * The two reports are the observable difference between the dialects: standard LTX treats every
 * `mod_system_*.ltx` as a config of its own and records an error for each, while the dialect knows
 * they patch `system.ltx` and verifies what the game would actually load.
 */
describe("ltx verify --dltx report", () => {
  const box = new Sandbox(__filename);

  beforeAll(() => {
    // A failed check, not a broken command: the errors are what this snapshot records.
    box.run("ltx verify", ["--path", gamedataDltx("configs"), "--silent", "--report", box.at("standard.json")], {
      expectExit: 3,
    });
    box.run("ltx verify", ["--path", gamedataDltx("configs"), "--dltx", "--silent", "--report", box.at("dltx.json")]);
  });

  it("should report the errors standard rules find in patch files", () => {
    expect(box.json("standard.json")).toMatchSnapshot();
  });

  it("should report a clean verification under the dialect", () => {
    expect(box.json("dltx.json")).toMatchSnapshot();
  });

  it("should verify the field only the patch supplies", () => {
    // The observable proof that the patch was applied rather than merely tolerated. `patched_by` is
    // declared by the scheme and written only in `mod_system_xxx.ltx`, so three verified fields means
    // the patch reached the resolved section; two would mean it did not.
    const report = box.json("dltx.json") as { result: { checkedFields: number } };

    expect(report.result.checkedFields).toBe(3);
  });
});
