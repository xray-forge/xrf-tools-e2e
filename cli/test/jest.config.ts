const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "../../");

/**
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ROOT_DIR,
  roots: ["<rootDir>/src/tests"],
  testMatch: ["**/*.test.ts"],
  cacheDirectory: "<rootDir>/target/jest_cache",
  moduleNameMapper: {
    "^#/(.*)": "<rootDir>/cli/$1",
    "^@/(.*)": "<rootDir>/src/$1",
  },
  // There is deliberately no `ci: true` here. Jest 30 honours the guard only from the `--ci`
  // command line flag; neither the config key nor a `CI` environment variable changes snapshot
  // creation, both verified against this version. The flag therefore lives in the npm scripts and
  // in the committed IntelliJ run configuration, which is what gutter clicks inherit.
  //
  // gamedata verify sweeps the whole tree in about 35 seconds, and the work happens in beforeAll,
  // which is bound by this same timeout.
  testTimeout: 120000,
  globalSetup: path.resolve(__dirname, "./global-setup.ts"),
  globalTeardown: path.resolve(__dirname, "./global-teardown.ts"),
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: path.resolve(ROOT_DIR, "tsconfig.json") }],
  },
};
