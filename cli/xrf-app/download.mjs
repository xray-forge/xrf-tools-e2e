import * as cp from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

if (process.platform !== "win32") {
  console.error(`No nightly xrf-app asset is published for '${process.platform}'`);
  process.exit(1);
}

// The application ships as an archive of one `xrf-app/` folder: the executable and the resources beside it.
const ASSET_NAME = "xrf-app-dev-windows-x64.zip";
const TARGET = path.resolve(PROJECT_ROOT, "target");
const DESTINATION = path.resolve(TARGET, "xrf-app");
const DOWNLOAD = path.resolve(TARGET, `${ASSET_NAME}.download`);
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
  await fs.rm(DESTINATION, { recursive: true, force: true });
  // Windows' own tar reads the archive as the zip it is.
  cp.execFileSync(path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe"), [
    "-xf",
    DOWNLOAD,
    "-C",
    TARGET,
  ]);

  console.log(`Downloaded ${URL}\n  unpacked to ${DESTINATION}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await fs.rm(DOWNLOAD, { force: true });
}
