import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SYSTEM_LTX = gamedata("configs/system.ltx");
const SHEET = gamedata("textures/ui/ui_test_sheet.dds");

describe("equipment sprite roundtrip", () => {
  const box = new Sandbox(__filename);

  let unpacked: CliResult;
  let packed: CliResult;
  let info: CliResult;

  beforeAll(() => {
    unpacked = box.run("sprite unpack-equipment", [
      "--system-ltx",
      SYSTEM_LTX,
      "--source",
      SHEET,
      "--output",
      box.at("icons"),
    ]);

    packed = box.run("sprite pack-equipment", [
      "--system-ltx",
      SYSTEM_LTX,
      "--source",
      box.at("icons"),
      "--output",
      box.at("repacked.dds"),
    ]);

    info = box.run("dds info", ["--path", box.at("repacked.dds")]);
  });

  // Only the opted-in sections are cut, so the section carrying $inventory_icon = false produces no
  // file even though its grid fields are complete.
  it("should unpack only the opted-in icons", () => {
    expect(unpacked).toMatchSnapshot();
  });

  it("should pack the icons back into a sheet", () => {
    expect(packed).toMatchSnapshot();
  });

  it("should describe the packed sheet", () => {
    expect(info).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
