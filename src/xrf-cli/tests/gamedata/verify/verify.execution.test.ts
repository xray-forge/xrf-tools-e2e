import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const GAMEDATA = gamedata();

/**
 * What `--jobs` promises: the width changes how the work is spread and nothing else.
 */
describe("gamedata verify execution width", () => {
  const box = new Sandbox(__filename);

  let sequential: CliResult;
  let wide: CliResult;

  beforeAll(() => {
    sequential = box.run("gamedata verify", [GAMEDATA, "-j", "1", "--report", box.at("sequential.json")], {
      expectExit: 3,
    });
    wide = box.run("gamedata verify", [GAMEDATA, "-j", "8", "--report", box.at("wide.json")], { expectExit: 3 });
  });

  it("should really have run at two different widths", () => {
    expect(envelopeAt(box.at("sequential.json")).execution).toEqual({ workers: 1, origin: "requested" });
    expect(envelopeAt(box.at("wide.json")).execution).toEqual({ workers: 8, origin: "requested" });
  });

  it("should have retained something worth comparing", () => {
    const cache = (envelopeAt(box.at("sequential.json")).result as { cache: Record<string, number> }).cache;

    expect(cache.entries).toBeGreaterThan(0);
    expect(cache.hits).toBeGreaterThan(0);
  });

  it("should print an identical run at any width", () => {
    expect(wide).toEqual(sequential);
  });

  it("should report an identical document at any width", () => {
    expect(box.json("wide.json")).toEqual(box.json("sequential.json"));
  });
});
