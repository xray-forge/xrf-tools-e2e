import * as cp from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

if (process.platform !== "win32" && process.platform !== "linux") {
  console.error(`No nightly xrf-cli asset is published for '${process.platform}'`);
  process.exit(1);
}

const WINDOWS = process.platform === "win32";
// The CLI ships as an archive of one `xrf-cli/` folder: the executable beside its licence notices.
const ASSET_NAME = WINDOWS ? "xrf-cli-dev-windows-x64.zip" : "xrf-cli-dev-linux-x64.tar.gz";
const EXECUTABLE_NAME = WINDOWS ? "xrf-cli.exe" : "xrf-cli";
const TARGET = path.resolve(PROJECT_ROOT, "target");
const DESTINATION = path.resolve(TARGET, EXECUTABLE_NAME);
const DOWNLOAD = path.resolve(TARGET, `${ASSET_NAME}.download`);
const UNPACKED = path.resolve(TARGET, "xrf-cli-download");
// Windows' own tar reads the zip; Git Bash's would not.
const TAR = WINDOWS ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
const URL = `https://github.com/xray-forge/xrf-tools/releases/download/nightly/${ASSET_NAME}`;

try {
  const response = await fetch(URL);

  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status} ${response.statusText}`);
  }

  const contents = Buffer.from(await response.arrayBuffer());

  if (contents.length === 0) {
    throw new Error("Downloaded asset is empty");
  }

  await fs.mkdir(TARGET, { recursive: true });
  await fs.writeFile(DOWNLOAD, contents);
  await fs.rm(UNPACKED, { recursive: true, force: true });
  await fs.mkdir(UNPACKED, { recursive: true });
  cp.execFileSync(TAR, ["-xf", DOWNLOAD, "-C", UNPACKED]);
  await fs.rm(DESTINATION, { force: true });
  await fs.rename(path.join(UNPACKED, "xrf-cli", EXECUTABLE_NAME), DESTINATION);

  if (!WINDOWS) {
    await fs.chmod(DESTINATION, 0o755);
  }

  console.log(`Downloaded ${URL}\n        to ${DESTINATION}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await fs.rm(DOWNLOAD, { force: true });
  await fs.rm(UNPACKED, { recursive: true, force: true });
}
