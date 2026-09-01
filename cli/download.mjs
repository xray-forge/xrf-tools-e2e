import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.platform !== "win32" && process.platform !== "linux") {
  console.error(`No nightly xrf-cli asset is published for '${process.platform}'`);
  process.exit(1);
}

const WINDOWS = process.platform === "win32";
const ASSET_NAME = WINDOWS ? "xrf-cli-dev.exe" : "xrf-cli-dev";
const EXECUTABLE_NAME = WINDOWS ? "xrf-cli.exe" : "xrf-cli";
const DESTINATION = path.resolve(PROJECT_ROOT, "target", EXECUTABLE_NAME);
const DOWNLOAD = `${DESTINATION}.download`;
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

  await fs.mkdir(path.dirname(DESTINATION), { recursive: true });
  await fs.writeFile(DOWNLOAD, contents);

  if (!WINDOWS) {
    await fs.chmod(DOWNLOAD, 0o755);
  }

  await fs.rm(DESTINATION, { force: true });
  await fs.rename(DOWNLOAD, DESTINATION);

  console.log(`Downloaded ${URL}\n        to ${DESTINATION}`);
} catch (error) {
  await fs.rm(DOWNLOAD, { force: true });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
