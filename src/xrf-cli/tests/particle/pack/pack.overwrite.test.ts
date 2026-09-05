import * as fs from "node:fs";

import { beforeAll, describe, expect, it } from "@jest/globals";

import { gamedata } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult, type ManifestFile } from "#/xrf-cli/test/sandbox";

const SOURCE = gamedata("particles.xr");

describe("particle pack overwrite", () => {
  const box = new Sandbox(__filename);

  let first: CliResult;
  let refused: CliResult;
  let forced: CliResult;
  let info: CliResult;

  let inputBeforeRefusal: Array<ManifestFile>;
  let inputAfterRefusal: Array<ManifestFile>;
  let destinationBeforeRefusal: string;
  let destinationAfterRefusal: string;
  let destinationBeforeForce: string;
  let destinationAfterForce: string;

  beforeAll(() => {
    box.run("particle unpack", ["--path", SOURCE, "--dest", box.at("unpacked")]);
    first = box.run("particle pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.xr")]);

    inputBeforeRefusal = box.manifest().filter((file) => file.path.startsWith("unpacked/"));
    destinationBeforeRefusal = box.sha("packed.xr");
    refused = box.run("particle pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.xr")], {
      expectExit: 1,
    });
    inputAfterRefusal = box.manifest().filter((file) => file.path.startsWith("unpacked/"));
    destinationAfterRefusal = box.sha("packed.xr");

    fs.appendFileSync(box.at("packed.xr"), "forced overwrite sentinel\n", "utf8");
    destinationBeforeForce = box.sha("packed.xr");
    forced = box.run("particle pack", ["--path", box.at("unpacked"), "--dest", box.at("packed.xr"), "--force"]);
    destinationAfterForce = box.sha("packed.xr");
    info = box.run("particle info", ["--path", box.at("packed.xr")]);
  });

  it("should publish into an empty destination", () => {
    expect(first).toMatchSnapshot();
  });

  it("should refuse an existing packed container", () => {
    expect(refused).toMatchSnapshot();
    expect(refused.stderr.join("\n")).toContain("--force");
  });

  it("should preserve the complete input and destination when refused", () => {
    expect(inputAfterRefusal).toEqual(inputBeforeRefusal);
    expect(destinationAfterRefusal).toBe(destinationBeforeRefusal);
  });

  it("should replace the container when forced", () => {
    expect(forced).toMatchSnapshot();
    expect(destinationBeforeForce).not.toBe(destinationBeforeRefusal);
    expect(destinationAfterForce).toBe(destinationBeforeRefusal);
  });

  it("should still describe the forced container", () => {
    expect(info).toMatchSnapshot();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
