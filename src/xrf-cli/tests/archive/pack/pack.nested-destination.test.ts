import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { envelopeAt } from "#/xrf-cli/test/envelope";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

/**
 * What a run says it packed, as far as this suite reads a report back.
 */
interface IPackResult {
  filesTotal: number;
}

/**
 * An output folder inside the tree being packed is an ordinary layout, and used to grow the archive on every rebuild.
 *
 * The walk reached the previous run's `<name>.db<N>` volumes and packed them as assets, because the skip list drops
 * `.db` and not `.db0`. The destination is pruned as a subtree instead, like an excluded directory and with a reason
 * of its own, so a rebuild packs the same files as the build before it. Not a refusal: a database folder beside the
 * gamedata inside one root is how installations are laid out. Not a skip-list entry either, which would drop an
 * archive somebody deliberately ships inside their tree.
 */
describe("archive pack nested destination", () => {
  const box = new Sandbox(__filename);

  let first: CliResult;
  let second: CliResult;

  beforeAll(() => {
    // Copied in rather than packed from the committed tree: the destination has to sit under the source, and nothing
    // may be written into the resources.
    box.copyIn(gamedata("configs"), "source/configs");

    const common: Array<string> = [
      box.at("source"),
      "--dest",
      box.at("source/packed"),
      "--name",
      "cfg",
      "--force",
      "--verbose",
    ];

    first = box.run("archive pack", [...common, "--report", box.at("first.json")]);
    // The second run walks a tree that now holds the first run's volume.
    second = box.run("archive pack", [...common, "--report", box.at("second.json")]);
  });

  it("should pack the same files on a rebuild over its own output", () => {
    const before: IPackResult = envelopeAt(box.at("first.json")).result as IPackResult;
    const after: IPackResult = envelopeAt(box.at("second.json")).result as IPackResult;

    expect(after.filesTotal).toBe(before.filesTotal);
  });

  it("should name the destination as an excluded directory once it exists", () => {
    expect(second.stdout).toContain("Excluded directory: packed (output directory)");
    // Nothing to prune on the first run, which is why the line is the second run's alone.
    expect(first.stdout).not.toContain("Excluded directory: packed (output directory)");
  });

  it("should say the same about both runs otherwise", () => {
    expect(first).toMatchSnapshot();
    expect(second).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest({ normalized: ["first.json", "second.json"] })).toMatchSnapshot();
  });
});
