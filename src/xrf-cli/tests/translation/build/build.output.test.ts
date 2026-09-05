import { beforeAll, describe, expect, it } from "@jest/globals";

import { resource } from "#/xrf-cli/test/constants";
import { Sandbox, type CliResult } from "#/xrf-cli/test/sandbox";

const SOURCE = resource("translations");

describe("translation build output selection and ordering", () => {
  const box = new Sandbox(__filename);

  let all: CliResult;
  let single: CliResult;
  let unsorted: CliResult;

  beforeAll(() => {
    // JSON is the only source format, so every file here compiles the same way: one multi-language
    // map into one string table per language. XML used to be a source too — neutral files copied to
    // every language, and `.eng.xml` files built into one — and is not any more.
    all = box.run("translation build", ["--path", SOURCE, "--output", box.at("all")]);
    single = box.run("translation build", ["--path", SOURCE, "--output", box.at("eng"), "--language", "eng"]);
    unsorted = box.run("translation build", ["--path", SOURCE, "--output", box.at("unsorted"), "--no-sort"]);
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

  // A missing translation compiles to the id itself, which is the engine's own fallback, so a
  // language a source does not carry still gets a complete table rather than a short one.
  it("should build a table for every language whatever the source carries", () => {
    expect(box.sha("all/eng/st_ui.xml")).not.toBe(box.sha("all/ukr/st_ui.xml"));
    expect(box.sha("all/ukr/st_ui.xml")).toBeTruthy();
  });

  it("should name the target after the json stem", () => {
    expect(box.sha("all/eng/st_ui.xml")).toBeTruthy();
    expect(box.sha("all/ukr/st_items.xml")).toBeTruthy();
  });

  it("should write the expected files", () => {
    expect(box.manifest()).toMatchSnapshot();
  });
});
