const os = require("node:os");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "../../../");
const E2E_OUTPUT_ROOT = path.resolve(ROOT_DIR, "target/e2e-cli");

const MAX_WORKERS = Math.max(1, Math.min(8, Math.floor(os.availableParallelism() / 2)));

/**
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ROOT_DIR,
  roots: ["<rootDir>/src/xrf-cli/tests"],
  testMatch: ["**/*.test.ts"],
  cacheDirectory: path.resolve(E2E_OUTPUT_ROOT, "jest-cache"),
  moduleNameMapper: {
    "^#/(.*)": "<rootDir>/cli/$1",
    "^@/(.*)": "<rootDir>/src/$1",
  },
  // Half the available cores, capped at eight, rather than Jest's default of one per core minus one.
  maxWorkers: MAX_WORKERS,
  testTimeout: 15_000,
  globalSetup: path.resolve(__dirname, "./global-setup.ts"),
  globalTeardown: path.resolve(__dirname, "./global-teardown.ts"),
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: path.resolve(ROOT_DIR, "tsconfig.json") }],
  },
};
