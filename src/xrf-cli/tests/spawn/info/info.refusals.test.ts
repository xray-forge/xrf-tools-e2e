import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What `spawn info` answers for a chunked file that is neither kind of `.spawn`.
 *
 * @remarks
 * The particle library walks as chunks like either spawn format, so the refusal comes from telling the kinds apart
 * rather than from a damaged chunk header, and its message names both kinds it expected.
 */
describe("spawn info refusals", () => {
  const box = new Sandbox(__filename);

  let neither: CliResult;

  beforeAll(() => {
    neither = box.run("spawn info", [gamedata("particles.xr"), "--report", box.at("neither-report.json")], {
      expectExit: 1,
    });
  });

  it("should refuse a file of neither spawn kind, naming both", () => {
    expect(neither).toMatchSnapshot();
  });

  it("should report the refusal without a result", () => {
    expect(box.json("neither-report.json")).toMatchObject({ exitCode: 1 });
    expect(box.json("neither-report.json")).not.toHaveProperty("result");
  });
});
