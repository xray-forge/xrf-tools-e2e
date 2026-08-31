import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXECUTABLE_NAME = process.platform === "win32" ? "xrf-cli.exe" : "xrf-cli";
const DESTINATION = path.resolve(PROJECT_ROOT, "target", EXECUTABLE_NAME);
const source = path.resolve(
  process.argv[2] ?? path.resolve(PROJECT_ROOT, "../xrf-tools/target/release", EXECUTABLE_NAME)
);

if (!fs.existsSync(source)) {
  console.error(
    [
      `No build found at '${source}'.`,
      "Build it in the tools repository first, for example with 'cargo make build-cli-release',",
      "or pass an explicit path: npm run cli:refresh -- <path-to-exe>",
    ].join("\n")
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(DESTINATION), { recursive: true });
fs.copyFileSync(source, DESTINATION);

console.log(`Copied ${source}\n    to ${DESTINATION}`);
