/**
 * Rebuild `src/resources/gamedata/spawns/all.spawn` from itself plus the shapes the base fixture cannot supply.
 *
 * The committed fixture is reduced from Call of Pripyat, which ships no cars, no traders, and no zone whose script tail
 * is absent. Those exist only in the forks, whose spawns are 96 MB installation files that cannot be committed. So the
 * extra objects live beside this script as ltx text lifted verbatim from a Call of Chernobyl unpack, and are appended
 * through the tool's own importer rather than by writing spawn bytes in JavaScript.
 *
 * Run it against the committed cli, then re-record the suite with `node cli/make-spawn-fixture.mjs` followed by
 * `npm run e2e:update`. Running it twice is a no-op: the additions replace their own previous entries.
 */
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, "..");
const EXECUTABLE = path.resolve(PROJECT_ROOT, "cli/app", process.platform === "win32" ? "xrf-cli.exe" : "xrf-cli");
const FIXTURE = path.resolve(PROJECT_ROOT, "src/resources/gamedata/spawns/all.spawn");
const ADDITIONS = path.resolve(HERE, "spawn-fixture");

const CRLF = "\r\n";

// Ltx is Windows-1251 on disk. Latin-1 maps every byte to one code unit and back, so reading and writing through it
// leaves the bytes untouched without this script needing an encoding table of its own.
const BYTEWISE = "latin1";

/**
 * Invoke the committed cli.
 *
 * @param {string} command - Space separated command and subcommand, such as `spawn pack`.
 * @param {string[]} args - Arguments to append.
 * @returns {void}
 */
function run(command, args) {
  execFileSync(EXECUTABLE, [command.split(" "), args].flat(2), { stdio: "inherit" });
}

/**
 * Split an ltx document into `[name]` sections, preserving order and body text.
 *
 * @param {string} file - Path of the ltx document to read.
 * @returns {{ name: string, body: string }[]} Sections in the order they appear.
 */
function sections(file) {
  const found = [];

  for (const block of fs.readFileSync(file, BYTEWISE).split(/\r?\n(?=\[)/)) {
    const match = /^\[([^\]]*)\]\r?\n?([\s\S]*)$/.exec(block.trim());

    if (match) {
      found.push({ name: match[1], body: match[2].trimEnd() });
    }
  }

  return found;
}

/**
 * Write sections back as an ltx document.
 *
 * @param {string} file - Path to write.
 * @param {{ name: string, body: string }[]} entries - Sections to render, in order.
 * @returns {void}
 */
function write(file, entries) {
  const rendered = entries
    .map(({ name, body }) => `[${name}]${CRLF}${body.replaceAll(/\r?\n/g, CRLF)}`)
    .join(CRLF + CRLF);

  fs.writeFileSync(file, Buffer.from(rendered + CRLF, BYTEWISE));
}

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-spawn-fixture-"));
const unpacked = path.join(workspace, "unpacked");

try {
  run("spawn unpack", ["--path", FIXTURE, "--dest", unpacked, "--force", "--silent"]);

  // ALife objects are keyed by their position in the file, so the merged list is renumbered from zero. Anything this
  // script added before is dropped first, so running it against an already rebuilt fixture is a no-op rather than a
  // second helping.
  const objectsFile = path.join(unpacked, "alife_spawns.ltx");
  const added = sections(path.join(ADDITIONS, "objects.ltx"));
  const addedSections = new Set(added.map(({ name }) => name));
  const objects = [
    ...sections(objectsFile).filter(({ body }) => !addedSections.has(/^section = (.+)$/m.exec(body)?.[1].trim())),
    ...added,
  ];

  objects.forEach((entry, index) => {
    entry.name = String(index);
  });

  write(objectsFile, objects);

  // The header carries its own object count, which reading the spawn asserts against the objects it found.
  const headerFile = path.join(unpacked, "header.ltx");

  write(
    headerFile,
    sections(headerFile).map((entry) => ({
      ...entry,
      body: entry.body.replace(/^objects = \d+$/m, `objects = ${objects.length}`),
    }))
  );

  // Patrols and their points are keyed by name, so the additions replace any same-named entry already present.
  for (const file of ["patrols.ltx", "patrol_points.ltx"]) {
    const additions = sections(path.join(ADDITIONS, file));
    const names = new Set(additions.map(({ name }) => name));

    write(path.join(unpacked, file), [
      ...sections(path.join(unpacked, file)).filter(({ name }) => !names.has(name)),
      ...additions,
    ]);
  }

  run("spawn pack", ["--path", unpacked, "--dest", FIXTURE, "--force", "--silent"]);

  console.log(`Rebuilt ${FIXTURE}`);
  console.log(`  added ${added.length} objects, ${objects.length} in total`);
  console.log("Re-record the suite with 'npm run e2e:update'.");
} finally {
  fs.rmSync(workspace, { force: true, recursive: true });
}
