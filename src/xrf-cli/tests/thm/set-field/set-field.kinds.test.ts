import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";
import { GROUP_THUMBNAIL, OBJECT_THUMBNAIL, SOUND_THUMBNAIL, writeThumbnail } from "#/xrf-cli/test/thumbnails";

const DESCRIPTOR = gamedata("textures/act_cat_bump.thm");

/** The other thumbnail kinds, by the name each is written under. */
const OTHERS: Array<[string, Buffer]> = [
  ["crate.thm", OBJECT_THUMBNAIL],
  ["forest.thm", GROUP_THUMBNAIL],
  ["door.thm", SOUND_THUMBNAIL],
];

describe("thm set-field over other thumbnail kinds", () => {
  const box = new Sandbox(__filename);

  let mixed: CliResult;
  let named: Array<CliResult>;
  let before: Record<string, string>;

  beforeAll(() => {
    box.copyIn(DESCRIPTOR, "mixed/cat.thm");

    for (const [name, bytes] of OTHERS) {
      writeThumbnail(box.at(`mixed/${name}`), bytes);
      writeThumbnail(box.at(`named/${name}`), bytes);
    }

    before = Object.fromEntries(OTHERS.map(([name]) => [name, box.sha(`mixed/${name}`)]));
    mixed = box.run("thm set-field", [box.at("mixed"), "--fade-amount", "40", "--report", box.at("mixed.json")]);
    named = OTHERS.map(([name]) =>
      box.run("thm set-field", [box.at(`named/${name}`), "--fade-amount", "40"], { expectExit: 1 })
    );
  });

  it("should edit the texture descriptor and skip every other kind in a directory", () => {
    expect(mixed).toMatchSnapshot();
    expect(box.json("mixed.json")).toMatchObject({ result: { skipped: 3, unchanged: 0 } });
  });

  it("should leave the skipped thumbnails byte for byte", () => {
    for (const [name] of OTHERS) {
      expect(box.sha(`mixed/${name}`)).toBe(before[name]);
    }
  });

  it("should refuse each other kind named on its own", () => {
    expect(named).toMatchSnapshot();

    for (const [name] of OTHERS) {
      expect(box.sha(`named/${name}`)).toBe(before[name]);
    }
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["mixed.json"] })).toMatchSnapshot();
  });
});
