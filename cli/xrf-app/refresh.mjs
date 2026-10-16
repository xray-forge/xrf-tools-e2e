import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXECUTABLE_NAME = "xrf-app.exe";
// Laid out as the published archive unpacks: the executable with the resources it reads beside it.
const DESTINATION = path.resolve(PROJECT_ROOT, "target", "xrf-app");
const built = path.resolve(process.argv[2] ?? path.resolve(PROJECT_ROOT, "../xrf-tools/target/release"));
const executable = path.join(built, EXECUTABLE_NAME);
const resources = path.join(built, "resources");

if (!fs.existsSync(executable) || !fs.existsSync(resources)) {
  console.error(
    [
      `No build found in '${built}': it needs '${EXECUTABLE_NAME}' and 'resources/' beside it.`,
      "Build it in the tools repository first, for example with 'cargo make build-app-release',",
      "or pass the directory holding a build: npm run app:refresh -- <path-to-directory>",
    ].join("\n")
  );
  process.exit(1);
}

fs.rmSync(DESTINATION, { recursive: true, force: true });
fs.mkdirSync(DESTINATION, { recursive: true });
fs.copyFileSync(executable, path.join(DESTINATION, EXECUTABLE_NAME));
fs.cpSync(resources, path.join(DESTINATION, "resources"), { recursive: true });

console.log(`Copied ${built}\n    to ${DESTINATION}`);
