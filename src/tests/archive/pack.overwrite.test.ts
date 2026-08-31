import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

/**
 * Publishing over an existing archive set is destructive and cannot be undone partway, so it is asked for rather
 * than assumed.
 */
describe("archive pack overwrite", () => {
  const box = new Sandbox(__filename);

  let first: CliResult;
  let refused: CliResult;
  let beside: CliResult;
  let forced: CliResult;

  let publishedBefore: string;
  let publishedAfterRefusal: string;

  beforeAll(() => {
    first = box.run("archive pack", ["--path", gamedata("configs"), "--dest", box.at("out"), "--name", "cfg"]);

    publishedBefore = box.sha("out/cfg.db");

    // The same destination and the same set name over a different source. Refused before anything is read, so the
    // volume the first run published is still the one on disk.
    refused = box.run("archive pack", ["--path", gamedata("textures"), "--dest", box.at("out"), "--name", "cfg"], {
      expectExit: 1,
    });

    publishedAfterRefusal = box.sha("out/cfg.db");

    // A second set in the same directory is ordinary: it publishes its own names and collides with nothing.
    beside = box.run("archive pack", ["--path", gamedata("textures"), "--dest", box.at("out"), "--name", "tex"]);

    forced = box.run("archive pack", [
      "--path",
      gamedata("textures"),
      "--dest",
      box.at("out"),
      "--name",
      "cfg",
      "--force",
    ]);
  });

  it("should publish into an empty destination", () => {
    expect(first).toMatchSnapshot();
  });

  it("should refuse a destination that already holds the set", () => {
    expect(refused).toMatchSnapshot();
    expect(refused.stderr.join("\n")).toContain("--force");
  });

  // The whole point of refusing: the archive the caller already had is the one still on disk.
  it("should leave the published set exactly as it was", () => {
    expect(publishedAfterRefusal).toBe(publishedBefore);
  });

  it("should publish a differently named set into the same directory", () => {
    expect(beside).toMatchSnapshot();
  });

  it("should replace the set when told to", () => {
    expect(forced).toMatchSnapshot();
    expect(box.sha("out/cfg.db")).not.toBe(publishedBefore);
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
