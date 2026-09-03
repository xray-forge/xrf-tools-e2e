<img src="https://xray-forge.github.io/xrf-book/images/xrf-tools-e2e-banner%400.5x.png" alt="XRF Tools">

# XRF Tools E2E

End-to-end suite for the `xrf-cli` command line application and the `xrf-app` desktop application from
[xrf-tools](https://github.com/xray-forge/xrf-tools). CLI tests run real commands against a real gamedata
tree and snapshot everything the commands produced, so a change in behavior arrives as a reviewable diff rather than as
something noticed by hand. Application tests drive the built executable through WebDriver and assert what its window
shows.

The CLI suite is plain Jest, laid out like `xrf-engine`: tooling in `cli/`, suite content in `src/`. Gutter icons,
running a single test, the debugger, `--watch`, and `-t` filtering all work the way they do everywhere else in the
workspace. The application suite is WebdriverIO: tooling in `cli/xrf-app/`, specs in `src/xrf-app/tests/`.

## Running

```bash
npm install
npm run cli:refresh
npm run e2e:cli
```

Without a local `xrf-tools` build, use `npm run cli:download` to fetch the current nightly development asset instead.

CLI tests and fixtures live under `src/xrf-cli/tests/` and `src/xrf-cli/resources/`. The executable
stays at ignored `target/xrf-cli` or `target/xrf-cli.exe`. The E2E workflow downloads the current nightly development
asset there; `cli:refresh` copies a local build to the same path. Generated sandboxes, timing files, the aggregate timing
report, and Jest cache live under `target/e2e-cli/`, which is deleted before every run.

| Command                         | Purpose                                             |
| ------------------------------- | --------------------------------------------------- |
| `npm run cli:download`          | Download the current nightly development CLI.       |
| `npm run cli:refresh -- [path]` | Copy a local build to the ignored target path.      |
| `npm run e2e:cli`               | Run every test against the target executable.       |
| `npm run e2e:cli -- -t ogf`     | Run tests matching a name.                          |
| `npm run e2e:cli:update`        | Record target executable behavior as new snapshots. |

## Application

Application specs live under `src/xrf-app/tests/` and drive ignored `target/xrf-app.exe` through
[tauri-driver](https://v2.tauri.app/develop/tests/webdriver/) and the Edge WebDriver matching the installed WebView2
runtime. Windows only. Install `tauri-driver` once with `cargo install tauri-driver`; the matching `msedgedriver` is
downloaded on demand. Driver logs and failure screenshots land under `target/e2e-app/`.

```bash
npm run app:refresh
npm run e2e:app
```

| Command                         | Purpose                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `npm run app:download`          | Download the current nightly development application.        |
| `npm run app:refresh -- [path]` | Copy a local `xrf-app.exe` build to the ignored target path. |
| `npm run e2e:app`               | Run the application specs against the target executable.     |
