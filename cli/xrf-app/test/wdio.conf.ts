import * as fs from "node:fs";
import * as path from "node:path";

import { browser } from "@wdio/globals";
import { type TauriCapabilities } from "@wdio/tauri-service";

const PROJECT_ROOT: string = path.resolve(__dirname, "../../..");

/**
 * The ignored binary under test.
 *
 * @remarks
 * CI downloads the current nightly application asset here through `app:download`; `npm run app:refresh`
 * copies a local build to the same path, so the configuration knows one location.
 */
export const APP_EXECUTABLE: string = path.resolve(PROJECT_ROOT, "target/xrf-app.exe");

/** Generated state from one application E2E run: driver logs and failure screenshots. */
export const APP_OUTPUT_ROOT: string = path.resolve(PROJECT_ROOT, "target/e2e-app");

/** Failure screenshots, wiped before a run so a stale picture cannot outlive the failure it shows. */
const SCREENSHOTS_ROOT: string = path.resolve(APP_OUTPUT_ROOT, "screenshots");

const capabilities: Array<TauriCapabilities> = [
  {
    browserName: "tauri",
    "tauri:options": {
      application: APP_EXECUTABLE,
    },
  },
];

export const config: WebdriverIO.Config = {
  runner: "local",
  specs: ["../../../src/xrf-app/tests/**/*.test.ts"],
  // One window drives one WebView2; a second instance would fight over the driver port.
  maxInstances: 1,
  capabilities,
  services: [
    [
      "@wdio/tauri-service",
      {
        // The published executable stays free of WebDriver code, so the driver is the external
        // `tauri-driver` process and the platform's WebView driver rather than an embedded server.
        driverProvider: "external",
        appBinaryPath: APP_EXECUTABLE,
        autoInstallTauriDriver: false,
        startTimeout: 60000,
      },
    ],
  ],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 120000,
  },
  reporters: ["spec"],
  logLevel: "info",
  outputDir: path.resolve(APP_OUTPUT_ROOT, "logs"),
  waitforTimeout: 15000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 1,
  onPrepare(): void {
    // The launcher has already opened its log stream under `outputDir`, so only the screenshots are cleared here.
    fs.rmSync(SCREENSHOTS_ROOT, { recursive: true, force: true });

    if (!fs.existsSync(APP_EXECUTABLE)) {
      throw new Error(`No executable at '${APP_EXECUTABLE}'.\nRun 'npm run app:refresh' or 'npm run app:download'.`);
    }
  },
  async before(): Promise<void> {
    // The service recovers window focus before every element command by asking its optional in-app plugin,
    // which this executable deliberately does not carry: each probe retries for seconds before giving up.
    // An explicit switch to the only window is the documented way to tell the service to stop recovering.
    await browser.switchToWindow(await browser.getWindowHandle());
  },
  async afterTest(test, _context, { passed }): Promise<void> {
    if (passed) {
      return;
    }

    const name: string = `${test.parent} ${test.title}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

    fs.mkdirSync(SCREENSHOTS_ROOT, { recursive: true });

    await browser.saveScreenshot(path.resolve(SCREENSHOTS_ROOT, `${name}.png`));
  },
};
