import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

describe("level verify AI map", () => {
  const box = new Sandbox(__filename);

  let warnings: CliResult;
  let selfLink: CliResult;

  beforeAll(() => {
    box.copyIn(resource("levels/ai-graph"), "ai-graph");
    box.copyIn(resource("levels/ai-self-link"), "ai-self-link");
    box.copyIn(resource("levels/triangle"), "triangle");

    warnings = box.run("level verify", [
      "--path",
      box.at("ai-graph"),
      "--verbose",
      "--report",
      box.at("ai-graph.json"),
    ]);
    selfLink = box.run(
      "level verify",
      ["--path", box.at("ai-self-link"), "--verbose", "--report", box.at("ai-self-link.json")],
      { expectExit: 3 }
    );
    box.run("level verify", ["--path", box.at("triangle"), "--report", box.at("triangle.json")]);
  });

  it("should pass a map with a one-way link and a detached part, warning of both", () => {
    expect(envelopeAt(box.at("ai-graph.json"))).toMatchObject({
      exitCode: 0,
      result: {
        status: "passed",
        aiCensus: { nodes: 5, oneWayNodes: 1, components: 2, largestComponent: 3 },
        checks: expect.arrayContaining([
          expect.objectContaining({
            id: "level.ai.graph",
            status: "passed",
            findings: [
              expect.objectContaining({ ruleId: "level.ai.disconnected" }),
              expect.objectContaining({ ruleId: "level.ai.one-way" }),
            ],
          }),
        ]),
      },
    });
    expect(warnings).toMatchSnapshot();
  });

  it("should fail a map with a node linked to itself", () => {
    expect(envelopeAt(box.at("ai-self-link.json"))).toMatchObject({
      exitCode: 3,
      result: {
        status: "failed",
        checks: expect.arrayContaining([
          expect.objectContaining({
            id: "level.ai.links",
            status: "failed",
            findings: [expect.objectContaining({ ruleId: "level.ai.self-link" })],
          }),
        ]),
      },
    });
    expect(selfLink).toMatchSnapshot();
  });

  it("should skip the AI checks for a level that ships no map", () => {
    expect(envelopeAt(box.at("triangle.json"))).toMatchObject({
      exitCode: 0,
      result: {
        aiCensus: null,
        checks: expect.arrayContaining([
          expect.objectContaining({ id: "level.ai.read", status: "skipped" }),
          expect.objectContaining({ id: "level.ai.links", status: "skipped" }),
          expect.objectContaining({ id: "level.ai.graph", status: "skipped" }),
        ]),
      },
    });
  });
});
