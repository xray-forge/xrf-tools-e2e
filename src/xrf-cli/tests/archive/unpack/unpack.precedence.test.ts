import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, sha, type CliResult } from "#/xrf-cli/test/sandbox";

const EXACT_PATH = "configs/system.ltx";

describe("archive unpack precedence", () => {
  const box = new Sandbox(__filename);

  let serial: CliResult;
  let parallel: CliResult;

  beforeAll(() => {
    box.write(`base/${EXACT_PATH}`, "base exact bytes");
    box.write(`patch/${EXACT_PATH}`, "patch exact bytes");

    box.run("archive pack", ["--path", box.at("base"), "--dest", box.at("archives"), "--name", "base"]);
    box.run("archive pack", ["--path", box.at("patch"), "--dest", box.at("archives"), "--name", "patch"]);

    serial = box.run("archive unpack", [
      "--path",
      box.at("archives"),
      "--dest",
      box.at("serial"),
      "-j",
      "1",
      "--report",
      box.at("serial-report.json"),
    ]);
    parallel = box.run("archive unpack", [
      "--path",
      box.at("archives"),
      "--dest",
      box.at("parallel"),
      "-j",
      "2",
      "--report",
      box.at("parallel-report.json"),
    ]);
  });

  it("should report the requested worker width and identical restore totals", () => {
    expect(serial.exitCode).toBe(0);
    expect(parallel.exitCode).toBe(0);
    expect(envelopeAt(box.at("serial-report.json"))).toMatchObject({
      execution: { origin: "requested", workers: 1 },
      result: { filesTotal: 2, filesUnpacked: 1, unpackedSize: 17 },
    });
    expect(envelopeAt(box.at("parallel-report.json"))).toMatchObject({
      execution: { origin: "requested", workers: 2 },
      result: { filesTotal: 2, filesUnpacked: 1, unpackedSize: 17 },
    });
  });

  it("should restore the exact-name patch at either worker width", () => {
    for (const destination of ["serial", "parallel"]) {
      expect(box.sha(`${destination}/gamedata/${EXACT_PATH}`)).toBe(sha(box.at(`patch/${EXACT_PATH}`)));
    }
  });

  it("should restore one physical file at either worker width", () => {
    for (const destination of ["serial", "parallel"]) {
      const restored = box.manifest().filter((file) => file.path.startsWith(`${destination}/gamedata/`));

      expect(restored).toHaveLength(1);
    }
  });

  it("should write the expected files", () => {
    expect(box.json("serial-report.json")).toMatchSnapshot();
    expect(box.json("parallel-report.json")).toMatchSnapshot();
    expect(box.manifest({ normalized: ["serial-report.json", "parallel-report.json"] })).toMatchSnapshot();
  });
});
