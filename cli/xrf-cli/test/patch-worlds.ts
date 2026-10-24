import * as fs from "node:fs";
import * as path from "node:path";

import { gamedata } from "./constants";
import { type Sandbox } from "./sandbox";

import { type Nullable } from "#/types";

/**
 * One edit made to a copy of the committed corpus before it becomes a side of a comparison.
 */
export interface WorldEdit {
  /** Corpus-relative path, with forward slashes. */
  path: string;
  /** New content, or `null` to delete the file. */
  content: Nullable<string>;
}

/** One entry of an `archive list` report, as far as these tests read it. */
interface ListedEntry {
  isDirectory: boolean;
  name: string;
}

/**
 * Copies the committed corpus into the sandbox and applies `edits`.
 *
 * @param box - Sandbox that owns the tree.
 * @param name - Sandbox-relative directory to build.
 * @param edits - Files to add, rewrite or delete relative to the corpus.
 * @returns Absolute path to the tree.
 */
export function createWorld(box: Sandbox, name: string, edits: Array<WorldEdit> = []): string {
  const root: string = box.copyIn(gamedata(), name);

  for (const edit of edits) {
    const absolute: string = path.join(root, ...edit.path.split("/"));

    if (edit.content === null) {
      fs.rmSync(absolute, { force: true });

      continue;
    }

    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, edit.content, "utf8");
  }

  return root;
}

/**
 * Builds a tree the same way and packs it into a volume set, answering the directory holding it.
 *
 * @remarks
 * The archived side of a comparison is produced by the tool itself rather than committed, so the
 * fixture cannot drift from what the packer actually writes, and a released mod is modelled as what
 * it really is: the same tree, packed.
 *
 * @param box - Sandbox that owns the volumes.
 * @param name - Sandbox-relative directory the volumes are written to.
 * @param edits - Files to add, rewrite or delete relative to the corpus.
 * @returns Absolute path to the directory holding the volume set.
 */
export function createPackedWorld(box: Sandbox, name: string, edits: Array<WorldEdit> = []): string {
  const source: string = createWorld(box, `${name}-source`, edits);
  const destination: string = box.at(name);

  box.run("archive pack", ["--path", source, "--dest", destination, "--name", name, "--silent"]);

  return destination;
}

/**
 * Engine names a published volume set holds, read back through the tool rather than from the report
 * that wrote it.
 *
 * @remarks
 * A patch report says what the run believed it carried; listing the volumes says what a reader of
 * the archive actually finds, which is the guarantee worth pinning. Directory rows are dropped from
 * the report's own `isDirectory` rather than by guessing at a trailing separator, so a root-level
 * entry such as `shaders.xr` is not mistaken for one.
 *
 * @param box - Sandbox that ran the patch.
 * @param destination - Absolute path to the directory holding the volumes.
 * @param reportName - Sandbox-relative path for the report this reads.
 * @returns Entry names, sorted, directory rows excluded.
 */
export function listPatchedEntries(box: Sandbox, destination: string, reportName: string): Array<string> {
  box.run("archive list", ["--path", destination, "--silent", "--report", box.at(reportName)]);

  const listed = box.json(reportName) as { result: { entries: Array<ListedEntry> } };

  return listed.result.entries
    .filter((entry: ListedEntry) => !entry.isDirectory)
    .map((entry: ListedEntry) => entry.name)
    .sort();
}

/** A config edit that changes the payload without changing its length. */
export const EDITED_SYSTEM_LTX = "[section]\nvalue = 2\n";

/** A config the corpus does not hold, so it can only ever be an addition. */
export const ADDED_WEAPON_LTX = "[wpn_added]\nammo_mag_size = 30\n";

/**
 * Builds an installation: an `fsgame.ltx`, its archives, and a loose `gamedata` tree over them.
 *
 * @remarks
 * The shape one root has to cover on its own. `XrayMountPlan::from_fsgame` reads the declaration file and mounts every
 * root it names, ordered as the engine registers them, which is why a comparison needs no layered list of its own.
 *
 * @param box - Sandbox that owns the installation.
 * @param name - Sandbox-relative directory to build it in.
 * @param edits - Files the loose tree overrides the archives with.
 * @returns Absolute path to the installation root.
 */
export function createInstallation(box: Sandbox, name: string, edits: Array<WorldEdit> = []): string {
  const root: string = box.at(name);

  box.write(
    `${name}/fsgame.ltx`,
    [
      "$app_data_root$ = true| false| $fs_root$| appdata\\",
      "$arch_dir$      = false| false| $fs_root$| db\\",
      "$game_data$     = true| true| $fs_root$| gamedata\\",
      "",
    ].join("\n")
  );

  const source: string = createWorld(box, `${name}-archived`);

  box.run("archive pack", ["--path", source, "--dest", path.join(root, "db"), "--name", "base", "--silent"]);

  // Only the overrides go loose. Everything else has to come from the volumes, so a run that failed to mount `db\`
  // would report the whole corpus as added rather than quietly agreeing.
  for (const edit of edits) {
    if (edit.content !== null) {
      box.write(`${name}/gamedata/${edit.path}`, edit.content);
    }
  }

  return root;
}
