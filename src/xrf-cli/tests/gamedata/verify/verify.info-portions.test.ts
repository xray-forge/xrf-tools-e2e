import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What the `info-portions` check of `gamedata verify` says about a tree whose quest reads portions nothing gives.
 *
 * @remarks
 * The tree is written here, since a portion's givers and readers hold together only across files. The logic reads
 * five portions: a condlist gives one, a dialog gives one, a script gives one by name, one is misspelt from the one
 * the condlist gives, and nothing gives the last. The engine accepts any spelling, so both findings are warnings: the
 * lenient run passes and only `--strict` fails it.
 */
describe("gamedata verify info-portions", () => {
  const box = new Sandbox(__filename);

  let lenient: CliResult;
  let strict: CliResult;

  beforeAll(() => {
    box.write("tree/configs/system.ltx", "[actor]\r\nclass = O_ACTOR\r\n");
    box.write(
      "tree/configs/scripts/quest.ltx",
      [
        "[sr_idle@wait]",
        "on_info = {+quest_started +quest_told +quest_scripted} sr_idle@next",
        "on_info2 = {+quest_strated} sr_idle@next",
        "on_info3 = {+quest_forgotten} sr_idle@next",
        "",
        "[sr_idle@start]",
        "on_info = sr_idle@wait %+quest_started%",
        "",
      ].join("\r\n")
    );
    box.write(
      "tree/configs/gameplay/dialogs.xml",
      '<game_dialogs><dialog id="quest_dialog"><phrase_list><phrase id="0"><give_info>quest_told</give_info>' +
        "</phrase></phrase_list></dialog></game_dialogs>"
    );
    box.write(
      "tree/scripts/quest.script",
      'function finish()\r\n  db.actor:give_info_portion("quest_scripted")\r\nend\r\n'
    );

    lenient = box.run("gamedata verify", [
      box.at("tree"),
      "--checks",
      "info-portions",
      "--report",
      box.at("report.json"),
    ]);
    strict = box.run("gamedata verify", [box.at("tree"), "--checks", "info-portions", "--strict", "--silent"], {
      expectExit: 3,
    });
  });

  it("should report the portions read and never given, the misspelt one with its likely spelling", () => {
    expect(lenient.exitCode).toBe(0);
    expect(box.json("report.json")).toMatchObject({
      exitCode: 0,
      result: {
        checks: [
          { id: "coverage", status: "skipped" },
          { id: "collisions", status: "skipped" },
          {
            id: "info-portions",
            status: "passed",
            summary: "5 info portions named; 2 read but never given",
            findings: [
              {
                ruleId: "info-portion.read-only",
                severity: "warning",
                subject: "configs/scripts/quest.ltx",
                message:
                  "Info portion 'quest_forgotten' is read by [sr_idle@wait] on_info3, but no condlist, dialog or " +
                  "spawned document gives it and no script names it",
              },
              {
                ruleId: "info-portion.read-only",
                severity: "warning",
                subject: "configs/scripts/quest.ltx",
                message:
                  "Info portion 'quest_strated' is read by [sr_idle@wait] on_info2, but no condlist, dialog or " +
                  "spawned document gives it and no script names it; did you mean 'quest_started'?",
              },
            ],
          },
        ],
      },
    });
  });

  it("should fail the warnings under strict", () => {
    expect(strict.exitCode).toBe(3);
  });

  it("should record only the report", () => {
    expect(
      box.manifest({ normalized: ["report.json"] }).filter((file) => !file.path.startsWith("tree/"))
    ).toMatchSnapshot();
  });
});
