import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/test/sandbox";

describe("docs generate", () => {
  const box = new Sandbox(__filename);

  let generated: CliResult;
  let check: CliResult;
  let drifted: CliResult;

  beforeAll(() => {
    // The only command that needs no input: the pages are rendered from the clap definitions, so
    // this covers the whole registered surface at once. Any command gaining, losing, or renaming an
    // argument moves a page hash in the manifest below.
    generated = box.run("docs generate", ["--output", box.at("docs")]);
    check = box.run("docs generate", ["--output", box.at("docs"), "--check"]);

    box.write("drifted/README.md", "# Not the generated docs\n");
    drifted = box.run("docs generate", ["--output", box.at("drifted"), "--check"], { expectExit: 3 });
  });

  it("should generate a page per command group", () => {
    expect(generated).toMatchSnapshot();
  });

  it("should accept pages it just wrote", () => {
    expect(check).toMatchSnapshot();
  });

  it("should reject pages that drifted", () => {
    expect(drifted).toMatchSnapshot();
  });

  // Recorded by hash rather than content: the pages restate every command's help text, which the
  // per-command tests already cover in the form callers actually see.
  it("should write the expected pages", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
