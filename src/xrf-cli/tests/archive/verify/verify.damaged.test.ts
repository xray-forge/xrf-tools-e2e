import { beforeAll, describe, expect, it } from "@jest/globals";

import { corruptFirstArchivePayload, truncateArchiveTail } from "#/xrf-cli/test/archive-damage";
import { envelopeAt, envelopeOf, type CommandEnvelope } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("archive verify damaged volume", () => {
  const box = new Sandbox(__filename);

  let opened: CliResult;
  let intact: CliResult;
  let verified: CliResult;
  let unreadable: CliResult;
  let completeHash: string;
  let damagedHash: string;
  let truncatedHash: string;

  beforeAll(() => {
    // Compression makes verification pass through decompression and CRC validation rather than merely copy a stored byte.
    box.write("source/payload.ltx", "payload ".repeat(4096));
    box.run("archive pack", ["--path", box.at("source"), "--dest", box.at("packed"), "--name", "fixture"]);

    const volume = box.at("packed/fixture.db");

    box.run("archive list", ["--path", volume, "--files", "--silent", "--report", box.at("listing.json")]);
    corruptFirstArchivePayload(volume, box.at("damaged/payload.db"));
    truncateArchiveTail(volume, box.at("damaged/truncated.db"));
    completeHash = box.sha("packed/fixture.db");
    damagedHash = box.sha("damaged/payload.db");
    truncatedHash = box.sha("damaged/truncated.db");

    opened = box.run("archive info", [
      "--path",
      box.at("damaged/payload.db"),
      "--silent",
      "--report",
      box.at("opened.json"),
    ]);
    intact = box.run("archive verify", ["--path", volume, "--silent", "--report", box.at("intact.json")]);
    verified = box.run(
      "archive verify",
      ["--path", box.at("damaged/payload.db"), "--silent", "--report", box.at("verify.json")],
      { expectExit: 3 }
    );
    unreadable = box.run("archive info", ["--path", box.at("damaged/truncated.db"), "--silent", "--json"], {
      expectExit: 1,
    });
  });

  it("should leave metadata and descriptors readable when only a payload changed", () => {
    const listing: CommandEnvelope = envelopeAt(box.at("listing.json"));
    const openedReport: CommandEnvelope = envelopeAt(box.at("opened.json"));
    const result = listing.result as { entries: Array<{ sizeCompressed: number; sizeReal: number }> };
    const [entry] = result.entries;

    expect(entry).toBeDefined();

    if (entry === undefined) {
      throw new Error("Packed archive listed no payload to corrupt.");
    }

    expect(entry.sizeCompressed).toBeLessThan(entry.sizeReal);
    expect(opened.exitCode).toBe(0);
    expect(openedReport.outcome).toBe("success");
  });

  it("should report a readable volume with a corrupt payload as a failed verification", () => {
    const report: CommandEnvelope = envelopeAt(box.at("verify.json"));

    expect(verified.exitCode).toBe(3);
    expect(report).toMatchObject({
      command: ["archive", "verify"],
      outcome: "checkFailed",
      exitCode: 3,
      result: { checked: 1, findings: [expect.objectContaining({ name: "payload.ltx" })] },
    });
  });

  it("should keep an intact volume valid before judging its damaged copy", () => {
    const report: CommandEnvelope = envelopeAt(box.at("intact.json"));

    expect(intact.exitCode).toBe(0);
    expect(report).toMatchObject({
      command: ["archive", "verify"],
      outcome: "success",
      exitCode: 0,
      result: { checked: 1, findings: [], status: "passed" },
    });
  });

  it("should fail before verification when a truncated descriptor table cannot open", () => {
    const report: CommandEnvelope = envelopeOf(unreadable);

    expect(unreadable.exitCode).toBe(1);
    expect(report).toMatchObject({
      command: ["archive", "info"],
      outcome: "executionFailed",
      exitCode: 1,
      result: null,
    });
  });

  it("should leave both input volumes unchanged while reading them", () => {
    expect(box.sha("packed/fixture.db")).toBe(completeHash);
    expect(box.sha("damaged/payload.db")).toBe(damagedHash);
    expect(box.sha("damaged/truncated.db")).toBe(truncatedHash);
  });

  it("should record the readable archive reports", () => {
    expect(box.json("listing.json")).toMatchSnapshot();
    expect(box.json("opened.json")).toMatchSnapshot();
    expect(box.json("intact.json")).toMatchSnapshot();
    expect(box.json("verify.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(
      box.manifest({ normalized: ["listing.json", "opened.json", "intact.json", "verify.json"] })
    ).toMatchSnapshot();
  });
});
