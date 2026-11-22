import { beforeAll, describe, expect, it } from "@jest/globals";

import { dialogPartners } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

/**
 * What the `dialogs` check of `gamedata verify` says about a tree whose partners offer what it does not declare.
 *
 * @remarks
 * `dialog-partners` gives `snag` an actor dialog no file declares, which stops the engine, and a profile, `nobody`,
 * whose class no character carries; the `system.ltx` added here names that profile, which the finding says, but only a
 * spawned NPC makes it stop the engine, so it is reported without failing, as are the two phrases naming text no
 * language defines. The logic section added here hands Snag one declared and one undeclared start dialog.
 */
describe("gamedata verify dialogs", () => {
  const box = new Sandbox(__filename);

  let broken: CliResult;
  let inputsBefore: Array<ManifestFile>;
  let inputsAfter: Array<ManifestFile>;

  beforeAll(() => {
    box.copyIn(dialogPartners(), "tree");
    box.write("tree/configs/system.ltx", "[nobody_spawn]\r\ncharacter_profile = nobody\r\n");
    box.write(
      "tree/configs/scripts/snag.ltx",
      "[meet@snag]\r\nmeet_dialog = {+snag_cache_known} snag_share_dialog, snag_gone_dialog\r\n"
    );
    inputsBefore = box.manifest().filter((file) => file.path.startsWith("tree/"));

    broken = box.run("gamedata verify", [box.at("tree"), "--checks", "dialogs", "--report", box.at("report.json")], {
      expectExit: 3,
    });
    inputsAfter = box.manifest().filter((file) => file.path.startsWith("tree/"));
  });

  it("should fail on what the engine asserts on and report what it tolerates", () => {
    expect(broken.exitCode).toBe(3);
    expect(box.json("report.json")).toMatchObject({
      exitCode: 3,
      result: {
        status: "failed",
        checks: [
          { id: "coverage", status: "skipped" },
          { id: "collisions", status: "skipped" },
          {
            id: "dialogs",
            status: "failed",
            summary:
              "5/5 dialogs valid; 3/4 profiles resolve; 9/11 references declared, 3 defects the engine tolerates",
            findings: [
              {
                ruleId: "dialog.offer-missing",
                subject: "configs/gameplay/character_desc_zaton.xml",
                message: "Character 'snag' offers actor dialog 'snag_missing_dialog', which no dialog file declares",
              },
              {
                ruleId: "dialog.text-missing",
                subject: "configs/gameplay/dialogs.xml",
                message: "Dialog 'about_quests' phrase '0' text 'about_quests_0' is defined in no language",
              },
              {
                ruleId: "dialog.text-missing",
                subject: "configs/gameplay/dialogs.xml",
                message: "Dialog 'snag_cache_dialog' phrase '12' text 'snag_cache_12' is defined in no language",
              },
              {
                ruleId: "dialog.profile-unresolved",
                subject: "configs/gameplay/npc_profile.xml",
                message:
                  "Profile 'nobody' picks by class 'no_such_class', which no team_default character without no_random " +
                  "has, and section [nobody_spawn] names it as its character_profile",
              },
              {
                ruleId: "dialog.logic-missing",
                subject: "configs/scripts/snag.ltx",
                message: "[meet@snag] meet_dialog names dialog 'snag_gone_dialog', which no dialog file declares",
              },
            ],
          },
        ],
      },
    });
  });

  it("should preserve every staged input byte", () => {
    expect(inputsAfter).toEqual(inputsBefore);
  });

  it("should record a readable report and only expected artifacts", () => {
    expect(box.json("report.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["report.json"] })).toMatchSnapshot();
  });
});
