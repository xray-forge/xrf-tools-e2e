import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const SYSTEM_LTX = gamedata("configs/system.ltx");

describe("pack-equipment-icons strict mode", () => {
  const box = new Sandbox(__filename);

  let lenient: CliResult;
  let strict: CliResult;

  beforeAll(() => {
    // Unpacking is how the icon files come to exist; this file then removes one so both packing
    // modes meet a set with a hole in it.
    box.run("unpack-equipment-icons", [
      "--system-ltx",
      SYSTEM_LTX,
      "--source",
      gamedata("textures/ui/ui_test_sheet.dds"),
      "--output",
      box.at("icons"),
    ]);

    fs.rmSync(box.at("icons/test_icon_b.dds"));

    // By default the sheet is still produced from what is there; strict refuses instead and names
    // what is missing, which is what a build should gate on rather than shipping a sheet with a
    // hole in it.
    lenient = box.run("pack-equipment-icons", [
      "--system-ltx",
      SYSTEM_LTX,
      "--source",
      box.at("icons"),
      "--output",
      box.at("lenient.dds"),
    ]);

    strict = box.run(
      "pack-equipment-icons",
      ["--system-ltx", SYSTEM_LTX, "--source", box.at("icons"), "--output", box.at("strict.dds"), "--strict"],
      { expectExit: 1 }
    );
  });

  it("should pack what it has when an icon is missing", () => {
    expect(lenient).toMatchSnapshot();
  });

  it("should refuse a missing icon under strict", () => {
    expect(strict).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
