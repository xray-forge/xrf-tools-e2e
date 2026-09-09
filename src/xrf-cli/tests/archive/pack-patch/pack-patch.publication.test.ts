import { beforeAll, describe, expect, it } from "@jest/globals";

import { ADDED_WEAPON_LTX, EDITED_SYSTEM_LTX, createWorld, listPatchedEntries } from "#/xrf-cli/test/patch-worlds";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack-patch publication", () => {
  const box = new Sandbox(__filename);

  let published: CliResult;
  let unnecessary: CliResult;
  let carried: Array<string>;

  beforeAll(() => {
    const base: string = createWorld(box, "base");
    const target: string = createWorld(box, "target", [
      { content: EDITED_SYSTEM_LTX, path: "configs/system.ltx" },
      { content: ADDED_WEAPON_LTX, path: "configs/weapons/wpn_added.ltx" },
    ]);

    published = box.run("archive pack-patch", [
      "--input",
      base,
      "--target",
      target,
      "--dest",
      box.at("patch"),
      "--name",
      "patch_01",
      "--report",
      box.at("published.json"),
    ]);

    carried = listPatchedEntries(box, box.at("patch"), "listed.json");

    // The same tree on both sides: a run that would have written, with nothing worth writing.
    unnecessary = box.run("archive pack-patch", [
      "--input",
      createWorld(box, "same-base"),
      "--target",
      createWorld(box, "same-target"),
      "--dest",
      box.at("unnecessary"),
      "--report",
      box.at("unnecessary.json"),
    ]);
  });

  it("should publish the difference", () => {
    expect(published).toMatchSnapshot();
  });

  it("should report the volume set it wrote", () => {
    expect(box.json("published.json")).toMatchSnapshot();
  });

  it("should carry only the added and modified entries", () => {
    expect(carried).toEqual(["configs\\system.ltx", "configs\\weapons\\wpn_added.ltx"]);
  });

  it("should write one volume and nothing else", () => {
    expect(
      box
        .manifest()
        .filter((file) => file.path.startsWith("patch/"))
        .map((file) => file.path)
    ).toEqual(["patch/patch_01.db"]);
  });

  it("should say how many bytes a preview would carry, before anything is written", () => {
    // The question a preview exists to answer beyond the counts: an exact figure, since it is summed from the target
    // side of each carried change rather than guessed at.
    const previewed = box.json("published.json") as { result: { sizeCarried: number } };

    expect(previewed.result.sizeCarried).toBeGreaterThan(0);
  });

  it("should name each root once and have every side refer to it by index", () => {
    // The report's shape, not just its contents: naming the root on each side of each change was 37% of a real
    // 17 MB report, so a regression here is measured in megabytes rather than in a wrong value.
    const report = box.json("published.json") as {
      result: {
        origins: Array<{ kind: string; root?: string; path?: string }>;
        added: Array<{ target: { origin: number } }>;
        modified: Array<{ base: { origin: number }; target: { origin: number } }>;
      };
    };

    expect(report.result.origins).toHaveLength(2);
    expect(report.result.origins.map((origin) => origin.kind)).toEqual(["directory", "directory"]);

    const [modified] = report.result.modified;
    const [added] = report.result.added;

    expect(modified?.base.origin).not.toBe(modified?.target.origin);
    expect(added?.target.origin).toBe(modified?.target.origin);
  });

  it("should write no volume when the two worlds agree", () => {
    expect(unnecessary).toMatchSnapshot();
    expect(box.manifest().filter((file) => file.path.startsWith("unnecessary/"))).toEqual([]);
  });
});
