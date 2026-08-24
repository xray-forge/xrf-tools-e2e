import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const DECLARATIONS = resource("declarations");

describe("externs export line endings", () => {
  const box = new Sandbox(__filename);

  let crlf: CliResult;

  beforeAll(() => {
    // Both endings are asked for explicitly. The default follows the platform, so on Windows a
    // crlf run is byte-identical to the default one and would prove nothing on its own.
    crlf = box.run("externs export", [
      DECLARATIONS,
      "--format",
      "json",
      "--output",
      box.at("crlf.json"),
      "--line-endings",
      "crlf",
    ]);
    box.run("externs export", [
      DECLARATIONS,
      "--format",
      "json",
      "--output",
      box.at("lf.json"),
      "--line-endings",
      "lf",
    ]);
  });

  it("should honour an explicit line ending", () => {
    expect(crlf).toMatchSnapshot();
  });

  // The same manifest written with different line endings cannot be the same bytes.
  it("should write different bytes for each line ending", () => {
    expect(box.sha("crlf.json")).not.toBe(box.sha("lf.json"));
  });

  // Recorded over raw bytes rather than normalized text: the line endings are the point here, and
  // normalizing would erase the very difference under test.
  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
