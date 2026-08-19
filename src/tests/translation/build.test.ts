import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/test/constants";
import { Sandbox, type CliResult } from "#/test/sandbox";

const SOURCE = resource("translations");

describe("build-translation", () => {
  const box = new Sandbox(__filename);

  let all: CliResult;
  let single: CliResult;
  let unsorted: CliResult;

  beforeAll(() => {
    // The source exercises the three paths the builder distinguishes, and its log says which it
    // took for each file: a json map compiled into every language, a neutral xml copied verbatim
    // into every language, and language-suffixed xml built into that language alone.
    all = box.run("build-translation", ["--path", SOURCE, "--output", box.at("all")]);
    single = box.run("build-translation", ["--path", SOURCE, "--output", box.at("eng"), "--language", "eng"]);
    unsorted = box.run("build-translation", ["--path", SOURCE, "--output", box.at("unsorted"), "--no-sort"]);
  });

  it("should build every language", () => {
    expect(all).toMatchSnapshot();
  });

  it("should build one language when asked", () => {
    expect(single).toMatchSnapshot();
  });

  it("should build without sorting", () => {
    expect(unsorted).toMatchSnapshot();
  });

  // Sorting is the default, so the two outputs must differ: the json source declares the medkit
  // before the bread, and sorting puts the bread first.
  it("should order sorted output differently from source order", () => {
    expect(box.sha("all/eng/st_items.xml")).not.toBe(box.sha("unsorted/eng/st_items.xml"));
  });

  // A neutral source carries no language of its own, so every language gets the same bytes.
  it("should copy a neutral source identically into every language", () => {
    expect(box.sha("all/rus/st_shared.xml")).toBe(box.sha("all/eng/st_shared.xml"));
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
