import { beforeAll, describe, expect, it } from "@jest/globals";

import type { CommandEnvelope } from "#/xrf-cli/test/envelope";
import {
  EDITED_SYSTEM_LTX,
  createInstallation,
  createPackedWorld,
  createWorld,
  listPatchedEntries,
} from "#/xrf-cli/test/patch-worlds";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/** What a comparison decided, without the provenance that differs per shape of run. */
interface PatchTotals {
  added: number;
  modified: number;
  payloadsRead: number;
  removed: number;
  unchanged: number;
}

describe("archive pack-patch sources", () => {
  const box = new Sandbox(__filename);

  const totals = (report: string): PatchTotals => {
    const envelope = box.json(report) as CommandEnvelope & {
      result: {
        added: Array<unknown>;
        modified: Array<unknown>;
        payloadsRead: number;
        removed: Array<unknown>;
        unchanged: number;
      };
    };

    return {
      added: envelope.result.added.length,
      modified: envelope.result.modified.length,
      payloadsRead: envelope.result.payloadsRead,
      removed: envelope.result.removed.length,
      unchanged: envelope.result.unchanged,
    };
  };

  const compare = (base: string, target: string, name: string): CliResult =>
    box.run("archive pack-patch", [
      "--base",
      base,
      "--target",
      target,
      "--dest",
      box.at(name),
      "--dry-run",
      "--silent",
      "--report",
      box.at(`${name}.json`),
    ]);

  const edit = [{ content: EDITED_SYSTEM_LTX, path: "configs/system.ltx" }];

  beforeAll(() => {
    compare(createPackedWorld(box, "archived-base"), createPackedWorld(box, "archived-target", edit), "archived");
    compare(createPackedWorld(box, "released"), createWorld(box, "build", edit), "released-to-build");
    compare(createWorld(box, "loose-base"), createWorld(box, "loose-target", edit), "loose");
  });

  it("should decide between two volume sets without reading a payload", () => {
    // The cheap shape: both name tables record a checksum, so nothing is decompressed to compare.
    expect(totals("archived.json")).toEqual({
      added: 0,
      modified: 1,
      payloadsRead: 0,
      removed: 0,
      unchanged: 28,
    });
  });

  it("should compare a released volume set against a loose build", () => {
    // The release workflow. Only the loose side lacks a recorded checksum, so only it is read.
    expect(totals("released-to-build.json")).toEqual({
      added: 0,
      modified: 1,
      payloadsRead: 28,
      removed: 0,
      unchanged: 28,
    });
  });

  it("should compare two loose trees", () => {
    expect(totals("loose.json")).toEqual({
      added: 0,
      modified: 1,
      payloadsRead: 28,
      removed: 0,
      unchanged: 28,
    });
  });

  it("covers a layered installation from one root", () => {
    // What replaced repeatable roots: `fsgame.ltx` is read for every root the game declares, so an installation whose
    // loose `gamedata\\` overrides its own `db\\` volumes is one path here, ordered the way the engine registers it.
    const install: string = createInstallation(box, "install", edit);

    compare(install, createWorld(box, "install-target", edit), "installation");

    expect(totals("installation.json")).toEqual({
      added: 0,
      modified: 0,
      payloadsRead: 29,
      removed: 0,
      unchanged: 29,
    });
  });

  it("should publish a patch a reader can list back", () => {
    box.run("archive pack-patch", [
      "--base",
      createPackedWorld(box, "readback-base"),
      "--target",
      createWorld(box, "readback-target", edit),
      "--dest",
      box.at("readback"),
      "--name",
      "readback",
      "--silent",
    ]);

    expect(listPatchedEntries(box, box.at("readback"), "readback-listed.json")).toEqual(["configs\\system.ltx"]);
  });
});
