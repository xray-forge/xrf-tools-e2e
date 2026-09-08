import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive unpack dry run", () => {
  const box = new Sandbox(__filename);

  let dry: CliResult;
  let unpack: CliResult;
  let destinationBefore: ReturnType<Sandbox["manifest"]>;

  beforeAll(() => {
    box.write("source/configs/nested/system.ltx", "archived bytes");
    box.run("archive pack", ["--path", box.at("source"), "--dest", box.at("packed"), "--name", "fixture"]);

    box.write("destination/sentinel.ltx", "leave this untouched");
    box.write("destination/gamedata/configs/nested/system.ltx", "pre-existing destination bytes");
    destinationBefore = box.manifest().filter((file) => file.path.startsWith("destination/"));
    dry = box.run("archive unpack", [
      "--path",
      box.at("packed/fixture.db"),
      "--dest",
      box.at("destination"),
      "--dry",
      "--report",
      box.at("dry-report.json"),
    ]);
    unpack = box.run("archive unpack", ["--path", box.at("packed/fixture.db"), "--dest", box.at("restored")]);
  });

  it("should report the unpack it would perform", () => {
    expect(dry).toMatchSnapshot();
    expect(box.json("dry-report.json")).toMatchSnapshot();
    expect(box.json("dry-report.json")).toMatchObject({
      command: ["archive", "unpack"],
      exitCode: 0,
      outcome: "success",
      result: expect.objectContaining({
        entries: 3,
        isDry: true,
      }),
    });
  });

  it("should preserve a pre-existing destination exactly", () => {
    const destinationAfter = box.manifest().filter((file) => file.path.startsWith("destination/"));

    expect(destinationAfter).toEqual(destinationBefore);
  });

  it("should restore the nested source bytes in a fresh ordinary unpack", () => {
    expect(unpack.exitCode).toBe(0);
    expect(box.sha("restored/gamedata/configs/nested/system.ltx")).toBe(
      sha(box.at("source/configs/nested/system.ltx"))
    );
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["dry-report.json"] })).toMatchSnapshot();
  });
});
