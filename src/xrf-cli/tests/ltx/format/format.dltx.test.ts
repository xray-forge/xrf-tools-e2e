import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedataDltx } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Formatting takes no dialect, and patch files are why that is worth pinning.
 *
 * @remarks
 * Canonical formatting is a rendering of what a file says, not of what it resolves to, so a
 * `![section]` header is another statement to lay out. A formatter that needed the dialect would
 * refuse to tidy a patch file, or worse, rewrite `![wpn_ak74]` as `[!wpn_ak74]`.
 */
describe("ltx format on patch files", () => {
  const box = new Sandbox(__filename);

  let check: CliResult;

  beforeAll(() => {
    box.copyIn(gamedataDltx("configs"), "configs");

    check = box.run("ltx format", ["--path", box.at("configs"), "--check"]);
  });

  it("should judge patch files without being told the dialect", () => {
    expect(check).toMatchSnapshot();
  });

  it("should leave every file untouched when only checking", () => {
    expect(box.manifest()).toMatchSnapshot();
  });

  it("should keep an override prefix outside the brackets when rewriting", () => {
    expect(box.run("ltx format", ["--path", box.at("configs")]).exitCode).toBe(0);
    expect(box.text("configs/mod_system_xxx.ltx")).toContain("![wpn_ak74]");
  });
});
