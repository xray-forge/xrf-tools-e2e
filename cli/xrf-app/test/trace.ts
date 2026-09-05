import * as fs from "node:fs";
import * as path from "node:path";

import { browser } from "@wdio/globals";

import { type Nullable } from "#/types";

/** Where one run's artifacts are written, and where the next run's wipe reaches. */
const TRACE_ROOT: string = path.resolve(__dirname, "../../../target/e2e-app/trace");

/** How many digits order the pictures of one spec file, which is more than any spec here will need. */
const STEP_DIGITS: number = 3;

/**
 * What one application run leaves behind to be looked at afterwards.
 *
 * @remarks
 * A driven window moves faster than a person can watch, so a run is reconstructed from stills rather than observed.
 * One directory per spec file holds the whole sequence in order: a picture after each command that changed the screen,
 * a picture at the end of each test, and the page as it stood when a test failed.
 *
 * An object rather than a module of functions because the three things it holds - which directory is open, how many
 * pictures it has taken, and whether it is already taking one - are one state and are only ever correct together. The
 * last of those is the reason: writing an artifact is itself a driver command, so anything that writes one while
 * writing one would ask for a picture of the picture forever. That guard is set in exactly one place below.
 */
export class Trace {
  private readonly root: string;

  private directory: Nullable<string> = null;
  private step: number = 0;
  private isWriting: boolean = false;

  /**
   * @param root - Directory the artifacts are written under.
   */
  public constructor(root: string = TRACE_ROOT) {
    this.root = root;
  }

  /**
   * Clears the artifacts of the previous run.
   *
   * @remarks
   * A stale picture is worse than none: it belongs to a failure that may already be fixed and reads as if it did not.
   */
  public reset(): void {
    fs.rmSync(this.root, { recursive: true, force: true });
  }

  /**
   * Opens a directory for one spec file.
   *
   * @remarks
   * The first suite wins, so a nested `describe` keeps writing into the file's own directory rather than starting a
   * second one halfway through and restarting the numbering.
   *
   * @param title - Suite title, which names the directory.
   */
  public open(title: string): void {
    if (this.directory || !title) {
      return;
    }

    this.directory = this.toDirectory(title);
    this.step = 0;

    fs.mkdirSync(this.directory, { recursive: true });
  }

  /**
   * Closes the directory of one spec file.
   *
   * @param title - Suite title, so a nested suite does not close its parent's directory.
   */
  public close(title: string): void {
    if (this.directory === this.toDirectory(title)) {
      this.directory = null;
    }
  }

  /**
   * Takes a picture of what one command did.
   *
   * @param command - Command that had just run, which names the picture.
   */
  public async captureStep(command: string): Promise<void> {
    await this.record(command, false);
  }

  /**
   * Takes a picture at the end of one test, and keeps the page itself when the test failed.
   *
   * @param title - Test title.
   * @param passed - Whether the test passed.
   */
  public async captureTest(title: string, passed: boolean): Promise<void> {
    await this.record(`end-${toSlug(title)}-${passed ? "passed" : "failed"}`, !passed);
  }

  /**
   * Writes one numbered artifact, and the page beside it when asked.
   *
   * @remarks
   * The only place that touches the guard, so every artifact is written under it and none can be written from inside
   * another. A driver that cannot answer is swallowed: a run that could not be photographed still has its assertions
   * to report, and a trace that throws would fail tests that passed.
   *
   * @param name - What the artifact is of, which follows its number in the filename.
   * @param withPageSource - Whether to keep the page as text beside the picture.
   */
  private async record(name: string, withPageSource: boolean): Promise<void> {
    const directory: Nullable<string> = this.directory;

    if (!directory || this.isWriting) {
      return;
    }

    this.isWriting = true;
    this.step += 1;

    // One stem for both artifacts, so the page and its picture sit together wherever the directory is sorted.
    const stem: string = path.resolve(directory, `${String(this.step).padStart(STEP_DIGITS, "0")}-${name}`);

    try {
      await browser.saveScreenshot(`${stem}.png`);

      if (withPageSource) {
        // The page as text, because most failures here are a missing element or a wrong value, and a picture is
        // silent about both.
        fs.writeFileSync(`${stem}.html`, await browser.getPageSource(), "utf8");
      }
    } catch {
      // Deliberately silent, for the reason in the remarks above.
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * The directory one suite writes into.
   *
   * @param title - Suite title.
   * @returns Its directory, whether or not it exists yet.
   */
  private toDirectory(title: string): string {
    return path.resolve(this.root, toSlug(title));
  }
}

/**
 * A title as a filename: lowercase, and every run of anything else a single dash.
 *
 * @param title - Suite or test title.
 * @returns The filename fragment for it.
 */
function toSlug(title: string): string {
  return title
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
