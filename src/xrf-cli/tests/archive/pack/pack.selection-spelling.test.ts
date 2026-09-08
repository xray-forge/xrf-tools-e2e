import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive pack LTX selection spellings", () => {
  const box = new Sandbox(__filename);

  const names: Array<string> = ["forward", "trailing", "case"];
  const spellings: Array<string> = ["configs/private", "configs\\private\\", "CONFIGS\\PRIVATE"];
  const packed: Array<CliResult> = [];
  let listed: CliResult;

  beforeAll(() => {
    box.write("source/configs/private/draft.ltx", "draft\n");
    box.write("source/configs/public/release.ltx", "release\n");
    box.write("source/configs/private-neighbor/keep.ltx", "neighbor\n");

    for (const [index, spelling] of spellings.entries()) {
      const name = names[index];

      if (name === undefined) {
        throw new Error(`No destination name for '${spelling}'.`);
      }

      const config = box.write(`${name}.ltx`, ["[exclude_folders]", `${spelling} = true`, ""].join("\n"));

      packed.push(
        box.run("archive pack", [
          "--path",
          box.at("source"),
          "--dest",
          box.at(name),
          "--name",
          "fixture",
          "--config",
          config,
        ])
      );
    }

    listed = box.run("archive list", ["--path", box.at("forward/fixture.db"), "--files"]);
  });

  it("should normalize separators, trailing separators, and case in xrCompress configuration", () => {
    expect(packed).toMatchSnapshot();

    for (const name of names.slice(1)) {
      expect(box.sha(`${name}/fixture.db`)).toBe(box.sha("forward/fixture.db"));
    }
  });

  it("should retain a component-boundary neighbour", () => {
    expect(listed.stdout).toEqual([
      "configs\\private-neighbor\\keep.ltx",
      "configs\\public\\release.ltx",
      "Listed 2 entries in <duration>",
    ]);
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
