import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * One page per command group, as the generator names them.
 */
const PAGES: ReadonlyArray<string> = [
  "archive.md",
  "dds.md",
  "dialog.md",
  "docs.md",
  "externs.md",
  "gamedata.md",
  "ltx.md",
  "ogf.md",
  "omf.md",
  "particle.md",
  "spawn.md",
  "sprite.md",
  "thm.md",
  "translation.md",
];

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

  // The pages themselves, not hashes of them. They are a published artifact - `xrf-book` includes
  // this directory verbatim - so a change to a table, an anchor, or the wording of an option belongs
  // in the diff where it can be read. The manifest below still hashes everything, which is what
  // catches a page appearing or disappearing.
  it.each(PAGES)("should render %s", (page: string) => {
    expect(box.text(`docs/${page}`)).toMatchSnapshot();
  });

  // The index is generated too, and it is the one page whose content is a claim about the others:
  // every group and every command, linked. A command added to the registry and not reaching here
  // would leave the reference quietly incomplete.
  it("should list every group and command in the index", () => {
    expect(box.text("docs/README.md")).toMatchSnapshot();
  });

  it("should write the expected pages", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
