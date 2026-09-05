import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const RESIDUE = gamedata("meshes/ogf/residue_split_motion_ref.ogf");

describe("ogf fix destination", () => {
  const box = new Sandbox(__filename);

  let sourceInfo: CliResult;
  let toDestination: CliResult;
  let fixedInfo: CliResult;
  let inPlace: CliResult;
  let sourceBefore: string;

  beforeAll(() => {
    sourceBefore = sha(RESIDUE);
    sourceInfo = box.run("ogf info", ["--path", RESIDUE, "--report", box.at("source.json")]);
    toDestination = box.run("ogf fix", [
      "--path",
      RESIDUE,
      "--dest",
      box.at("fixed.ogf"),
      "--report",
      box.at("fixed.json"),
    ]);
    fixedInfo = box.run("ogf info", ["--path", box.at("fixed.ogf"), "--report", box.at("fixed-info.json")]);

    box.copyIn(RESIDUE, "in-place.ogf");
    inPlace = box.run("ogf fix", ["--path", box.at("in-place.ogf")]);
  });

  it("should expose the split reference residue before fixing", () => {
    expect(sourceInfo.exitCode).toBe(0);
    expect(box.json("source.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: {
        motionRefs: [
          "actors\\stalker_animation",
          "actors\\stalker_scripts_animation",
          "actors\\zombied_animation",
          "actors\\stalker_smart_cover_animation",
          "omf\\wpn_mp5_hud_animation",
        ],
        residue: {
          cause: "split-motion-ref",
          discardedReference: "actors\\stalker_scenario_animation",
          position: 219,
          size: 34,
        },
      },
    });
  });

  it("should name the discarded reference before writing", () => {
    expect(toDestination).toMatchSnapshot();
  });

  it("should report the normalized visual", () => {
    expect(box.json("fixed.json")).toMatchSnapshot();
  });

  it("should read back the same references with no residue", () => {
    expect(fixedInfo).toMatchSnapshot();
    expect(box.json("fixed-info.json")).toMatchObject({
      result: {
        motionRefs: [
          "actors\\stalker_animation",
          "actors\\stalker_scripts_animation",
          "actors\\zombied_animation",
          "actors\\stalker_smart_cover_animation",
          "omf\\wpn_mp5_hud_animation",
        ],
        residue: null,
      },
    });
  });

  it("should preserve its source and write the same bytes in either mode", () => {
    expect(sha(RESIDUE)).toBe(sourceBefore);
    expect(box.sha("fixed.ogf")).not.toBe(sourceBefore);
    expect(inPlace.exitCode).toBe(0);
    expect(box.sha("in-place.ogf")).toBe(box.sha("fixed.ogf"));
  });

  it("should write only the destination, in-place copy and reports", () => {
    expect(box.manifest({ normalized: ["fixed-info.json", "fixed.json", "source.json"] })).toMatchSnapshot();
  });
});
