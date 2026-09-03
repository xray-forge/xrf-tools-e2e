import { beforeAll, describe, expect, it } from "@jest/globals";

import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * Extracts the real subcommand names listed by clap help.
 *
 * @param lines - Normalized help output.
 * @returns Named subcommands, excluding clap's synthetic `help` command.
 */
export function commandNamesFromHelp(lines: Array<string>): Array<string> {
  const commandsStart: number = lines.indexOf("Commands:");

  if (commandsStart === -1) {
    throw new Error("Expected clap help to contain a Commands section.");
  }

  const names: Array<string> = [];

  for (const line of lines.slice(commandsStart + 1)) {
    if (line === "") {
      break;
    }

    const match = line.match(/^\s{2}(\S+)\s{2,}/);

    if (match === null || match[1] === undefined) {
      throw new Error(`Could not read a clap command row: '${line}'.`);
    }

    if (match[1] !== "help") {
      names.push(match[1]);
    }
  }

  if (names.length === 0) {
    throw new Error("Expected clap help to contain at least one non-help command.");
  }

  if (new Set(names).size !== names.length) {
    throw new Error("Expected clap help to list every command only once.");
  }

  return names;
}

/**
 * Defines the leaf-help contract for one CLI domain.
 *
 * @param domain - Root-level CLI domain that owns the leaf commands.
 * @param testFile - Calling test file, used to isolate its sandbox and snapshots.
 */
export function testDomainHelp(domain: string, testFile: string): void {
  describe(`${domain} command help`, () => {
    const box = new Sandbox(testFile);

    let domainHelp: CliResult;
    let operations: Array<string>;
    let leafHelp: Record<string, CliResult>;

    beforeAll(() => {
      domainHelp = box.run(domain, ["--help"]);
      operations = commandNamesFromHelp(domainHelp.stdout);
      leafHelp = Object.fromEntries(
        operations.map((operation) => [operation, box.run(`${domain} ${operation}`, ["--help"])])
      );
    });

    it("should cover every operation named in domain help", () => {
      expect(Object.keys(leafHelp)).toEqual(operations);
    });

    it("should keep each leaf command's help stable", () => {
      expect(leafHelp).toMatchSnapshot();
    });
  });
}
