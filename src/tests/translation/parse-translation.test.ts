import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("parse-translation", () => {
  const box = new Sandbox(__filename);

  let parse: CliResult;

  beforeAll(() => {
    parse = box.run("parse-translation", ["--path", box.copyIn(resource("translations"), "translations")]);
  });

  // The command is registered and exits cleanly, but its implementation is still a stub: it reads
  // nothing, writes nothing, and says nothing. Recording that keeps the gap visible and turns the
  // day someone implements it into a reviewed snapshot change rather than a silent one.
  it("should currently do nothing", () => {
    expect(parse).toMatchSnapshot();
  });

  it("should leave the sources untouched", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
