import * as fs from "node:fs";
import * as path from "node:path";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { TESTS_ROOT } from "#/test/constants";
import { commandNamesFromHelp } from "#/test/help";
import { Sandbox, type CliResult } from "#/test/sandbox";

describe("CLI help tree", () => {
  const box = new Sandbox(__filename);

  let root: CliResult;
  let domainNames: Array<string>;
  let domains: Record<string, CliResult>;
  let bareDomains: Record<string, CliResult>;

  beforeAll(() => {
    root = box.run("", ["--help"]);
    domainNames = commandNamesFromHelp(root.stdout);
    domains = Object.fromEntries(domainNames.map((domain) => [domain, box.run(domain, ["--help"])]));
    bareDomains = Object.fromEntries(domainNames.map((domain) => [domain, box.run(domain, [], { expectExit: 2 })]));
  });

  it("should expose every domain from root help", () => {
    expect(root).toMatchSnapshot();
  });

  it("should give every domain an owning leaf-help suite", () => {
    const withoutSuite: Array<string> = domainNames.filter(
      (domain) => !fs.existsSync(path.join(TESTS_ROOT, domain, "help.test.ts"))
    );

    expect(withoutSuite).toEqual([]);
  });

  it("should expose each domain's operations", () => {
    expect(domains).toMatchSnapshot();
  });

  it("should show domain help when an operation is missing", () => {
    expect(bareDomains).toMatchSnapshot();
  });
});
