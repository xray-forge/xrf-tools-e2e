import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const DESCRIPTION = gamedata("configs/ui/textures_descr/ui_test_sheet.xml");

describe("sprite unpack-description unknown file", () => {
  const box = new Sandbox(__filename);

  let unknown: CliResult;

  beforeAll(() => {
    // A name the description does not carry is refused with the names it does, rather than
    // producing an empty run that looks like success.
    unknown = box.run(
      "sprite unpack-description",
      [
        "--description",
        DESCRIPTION,
        "--base",
        gamedata("textures"),
        "--output",
        box.at("unknown"),
        "--file",
        "no_such_file",
      ],
      { expectExit: 1 }
    );
  });

  it("should refuse a name the description does not carry", () => {
    expect(unknown).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
