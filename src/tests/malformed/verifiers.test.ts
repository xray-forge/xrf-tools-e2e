import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

/**
 * A verifier's contract differs from a reader's. A reader hands back one file's contents and can
 * only refuse when they are damaged; a verifier is asked to survey something and report on it, so
 * it may reasonably record the damage as a finding and carry on. Which of the two each command
 * does is what these cases pin down, because nothing else in the suite says.
 */
describe("verifiers meet damaged input", () => {
  const box = new Sandbox(__filename);

  let ogf: CliResult;
  let particles: CliResult;
  let spawn: CliResult;
  let icons: CliResult;

  beforeAll(() => {
    // Damaged content is a judged verdict: every verifier answers 3 rather than the operational 1.
    const fail = { expectExit: 3 };

    ogf = box.run(
      "verify-ogf",
      ["--path", box.copyTruncated(gamedata("meshes/ogf/part_none.ogf"), "bad.ogf", 200)],
      fail
    );
    particles = box.run(
      "verify-particles",
      ["--path", box.copyTruncated(gamedata("particles.xr"), "bad.xr", 500)],
      fail
    );
    spawn = box.run(
      "verify-spawn",
      ["--path", box.copyTruncated(gamedata("spawns/all.spawn"), "bad.spawn", 400)],
      fail
    );

    icons = box.run(
      "verify-equipment-icons",
      ["--system-ltx", box.write("broken.ltx", "[unterminated\n$inventory_icon = true\n")],
      fail
    );
  });

  // Reports the damage as a failed verification rather than refusing to run, and still reaches a
  // verdict. The three below refuse instead, which is the distinction this file exists to record.
  it("should report a damaged visual as a failed verification", () => {
    expect(ogf).toMatchSnapshot();
  });

  it("should refuse a damaged particle container", () => {
    expect(particles).toMatchSnapshot();
  });

  it("should refuse a damaged spawn", () => {
    expect(spawn).toMatchSnapshot();
  });

  it("should refuse an unparseable icon configuration", () => {
    expect(icons).toMatchSnapshot();
  });

  it("should write nothing beyond the damaged inputs", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
