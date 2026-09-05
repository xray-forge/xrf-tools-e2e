import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * How directory and explicit-file selection differ for formatter inputs.
 */
describe("ltx format selection", () => {
  const box = new Sandbox(__filename);

  let directoryFormat: CliResult;
  let explicitFormat: CliResult;
  let selectedBefore: Array<string>;
  let selectedAfterDirectoryFormat: Array<string>;
  let neighborBefore: Array<string>;
  let neighborAfterDirectoryFormat: Array<string>;

  beforeAll(() => {
    const inputs: string = box.at("inputs");

    // A directory sweep is deliberately extension-filtered, while an explicitly named file is not.
    box.write("inputs/selected.txt", "[selected]\nvalue=1\n");
    box.write("inputs/neighbor.ltx", "[neighbor]\nvalue=2\n");
    selectedBefore = box.raw("inputs/selected.txt");
    neighborBefore = box.raw("inputs/neighbor.ltx");

    directoryFormat = box.run("ltx format", ["--path", inputs]);
    selectedAfterDirectoryFormat = box.raw("inputs/selected.txt");
    neighborAfterDirectoryFormat = box.raw("inputs/neighbor.ltx");

    explicitFormat = box.run("ltx format", ["--path", box.at("inputs/selected.txt")]);
  });

  it("should format only the LTX neighbor from a directory", () => {
    expect(directoryFormat).toMatchSnapshot();
    expect(selectedAfterDirectoryFormat).toEqual(selectedBefore);
    expect(neighborAfterDirectoryFormat).not.toEqual(neighborBefore);
  });

  it("should format an explicitly named non-LTX file", () => {
    expect(explicitFormat).toMatchSnapshot();
    expect(box.raw("inputs/selected.txt")).not.toEqual(selectedBefore);
    expect(box.raw("inputs/neighbor.ltx")).toEqual(neighborAfterDirectoryFormat);
    expect({
      selected: box.raw("inputs/selected.txt"),
      neighbor: box.raw("inputs/neighbor.ltx"),
    }).toMatchSnapshot();
  });

  it("should leave no extra output beside the selected inputs", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
