import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/test/sandbox";

const DOMAINS = [
  "archive",
  "assets",
  "dialog",
  "docs",
  "externs",
  "gamedata",
  "ltx",
  "ogf",
  "omf",
  "particle",
  "spawn",
  "texture",
  "thm",
  "translation",
];

describe("CLI help tree", () => {
  const box = new Sandbox(__filename);

  let root: CliResult;
  let domains: Record<string, CliResult>;
  let bareDomains: Record<string, CliResult>;

  beforeAll(() => {
    root = box.run("", ["--help"]);
    domains = Object.fromEntries(DOMAINS.map((domain) => [domain, box.run(domain, ["--help"])]));
    bareDomains = Object.fromEntries(DOMAINS.map((domain) => [domain, box.run(domain, [], { expectExit: 2 })]));
  });

  it("should expose every domain from root help", () => {
    expect(root).toMatchSnapshot();
  });

  it("should expose each domain's operations", () => {
    expect(domains).toMatchSnapshot();
  });

  it("should show domain help when an operation is missing", () => {
    expect(bareDomains).toMatchSnapshot();
  });
});
