import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, sha, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const MAXIMUM_VOLUME_BYTES = 1024 * 1024;
const PAYLOAD_BYTES = 600 * 1024;
const PAYLOADS = [
  { name: "payload-a.bin", byte: "A" },
  { name: "payload-b.bin", byte: "B" },
  { name: "payload-c.bin", byte: "C" },
];

describe("archive pack multiple indexed volumes", () => {
  const box = new Sandbox(__filename);

  let pack: CliResult;
  let unpackedSet: CliResult;
  let unpackedLast: CliResult;

  beforeAll(() => {
    for (const payload of PAYLOADS) {
      box.write(`source/${payload.name}`, payload.byte.repeat(PAYLOAD_BYTES));
    }

    pack = box.run("archive pack", [
      "--path",
      box.at("source"),
      "--dest",
      box.at("packed"),
      "--name",
      "fixture",
      "--store",
      "--max-size",
      "1",
      "--report",
      box.at("pack-report.json"),
    ]);
    unpackedSet = box.run("archive unpack", [
      "--path",
      box.at("packed"),
      "--dest",
      box.at("from-set"),
      "--report",
      box.at("set-report.json"),
    ]);
    unpackedLast = box.run("archive unpack", [
      "--path",
      box.at("packed/fixture.db2"),
      "--dest",
      box.at("from-last"),
      "--report",
      box.at("last-report.json"),
    ]);
  });

  it("should publish three indexed volumes within the requested cap", () => {
    const volumes: Array<ManifestFile> = box.manifest().filter((file) => file.path.startsWith("packed/"));

    expect(pack.exitCode).toBe(0);
    expect(volumes.map((volume) => volume.path)).toEqual([
      "packed/fixture.db0",
      "packed/fixture.db1",
      "packed/fixture.db2",
    ]);

    for (const volume of volumes) {
      expect(volume.size).toBeLessThanOrEqual(MAXIMUM_VOLUME_BYTES);
    }
  });

  it("should restore every payload byte from the complete volume set", () => {
    expect(unpackedSet.exitCode).toBe(0);

    for (const payload of PAYLOADS) {
      expect(box.sha(`from-set/gamedata/${payload.name}`)).toBe(sha(box.at(`source/${payload.name}`)));
    }
  });

  it("should restore only the member of the selected final volume", () => {
    const restored: Array<ManifestFile> = box.manifest().filter((file) => file.path.startsWith("from-last/gamedata/"));

    expect(unpackedLast.exitCode).toBe(0);
    expect(restored.map((file) => file.path)).toEqual(["from-last/gamedata/payload-c.bin"]);
    expect(box.sha("from-last/gamedata/payload-c.bin")).toBe(sha(box.at("source/payload-c.bin")));
  });

  it("should report the complete and selected restore counts", () => {
    expect(box.json("set-report.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: { filesUnpacked: 3, unpackedSize: PAYLOAD_BYTES * PAYLOADS.length },
    });
    expect(box.json("last-report.json")).toMatchObject({
      exitCode: 0,
      outcome: "success",
      result: { filesUnpacked: 1, unpackedSize: PAYLOAD_BYTES },
    });
  });

  it("should write the expected files and reports", () => {
    expect(box.json("pack-report.json")).toMatchSnapshot();
    expect(box.json("set-report.json")).toMatchSnapshot();
    expect(box.json("last-report.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["pack-report.json", "set-report.json", "last-report.json"] })).toMatchSnapshot();
  });
});
