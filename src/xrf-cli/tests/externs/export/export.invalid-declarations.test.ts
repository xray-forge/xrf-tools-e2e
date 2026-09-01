import { beforeAll, describe, expect, it } from "@jest/globals";

import { envelopeAt, type CommandEnvelope } from "#/test/envelope";
import { Sandbox, type CliResult } from "#/test/sandbox";

const DUPLICATE_DECLARATIONS: string = [
  "export {};",
  "",
  'extern("xr_effects.give_item", (section: string): void => {});',
  'extern("xr_effects.give_item", (section: string): void => {});',
  "",
].join("\n");

const MALFORMED_DECLARATIONS: string = 'export {}; extern("xr_effects.give_item", (): void => );\n';

describe("externs export invalid declarations", () => {
  const box = new Sandbox(__filename);

  let duplicate: CliResult;
  let malformed: CliResult;
  let missingRoot: CliResult;

  beforeAll(() => {
    box.write("duplicate/externs.ts", DUPLICATE_DECLARATIONS);
    box.write("malformed/externs.ts", MALFORMED_DECLARATIONS);
    // The artifact is beside the point in every run below: the declarations fail before it is read.
    box.write("externs.json", '{ "exports": {} }\n');

    // A name declared twice is content the check judged, which the failure contract answers with 3.
    duplicate = box.run(
      "externs export",
      [box.at("duplicate"), "--check", box.at("externs.json"), "--report", box.at("duplicate.json")],
      { expectExit: 3 }
    );

    // So is a declaration source the parser cannot read a contract from at all.
    malformed = box.run("externs export", [box.at("malformed"), "--check", box.at("externs.json")], { expectExit: 3 });

    // A root that cannot be walked was never judged, so it stays an execution failure.
    missingRoot = box.run("externs export", [box.at("absent"), "--check", box.at("externs.json")], { expectExit: 1 });
  });

  it("should reject a duplicate declaration as a check failure", () => {
    expect(duplicate).toMatchSnapshot();
  });

  it("should reject malformed declarations as a check failure", () => {
    expect(malformed).toMatchSnapshot();
  });

  it("should refuse a missing declarations root as an execution failure", () => {
    expect(missingRoot).toMatchSnapshot();
  });

  // The verdict is the exit code; what explains it reaches a caller under the envelope's `result`,
  // which is the half that would be lost if invalid declarations aborted the run instead.
  it("should carry the declaration finding under the envelope result", () => {
    const envelope: CommandEnvelope = envelopeAt(box.at("duplicate.json"));

    expect(envelope.command).toEqual(["externs", "export"]);
    expect(envelope.outcome).toBe("checkFailed");
    expect(envelope.exitCode).toBe(3);
  });

  it("should report what the declarations were judged on", () => {
    expect(box.json("duplicate.json")).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["duplicate.json"] })).toMatchSnapshot();
  });
});
