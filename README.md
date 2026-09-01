<img src="https://xray-forge.github.io/xrf-book/images/xrf-tools-e2e-banner%400.5x.png" alt="XRF Tools">

# XRF Tooles E2E

End-to-end suite for the `xrf-cli` command line application from
[xrf-tools](https://github.com/xray-forge/xrf-tools). Tests run real commands against a real gamedata
tree and snapshot everything the commands produced, so a change in behavior arrives as a reviewable diff rather than as
something noticed by hand.

It is plain Jest, laid out like `xrf-engine`: tooling in `cli/`, suite content in `src/`. Gutter icons, running a
single test, the debugger, `--watch`, and `-t` filtering all work the way they do everywhere else in the workspace.

## Running

```bash
npm install
npm run cli:refresh
npm run e2e
```

Without a local `xrf-tools` build, use `npm run cli:download` to fetch the current nightly development asset instead.

CLI tests and fixtures live under `src/xrf-cli/tests/` and `src/xrf-cli/resources/`; future application tests and
fixtures belong under matching `src/xrf-app/` directories. The executable
stays at ignored `target/xrf-cli` or `target/xrf-cli.exe`. The E2E workflow downloads the current nightly development
asset there; `cli:refresh` copies a local build to the same path. Generated sandboxes, timing files, the aggregate timing
report, and Jest cache live under `target/e2e/`, which is deleted before every run.

| Command                         | Purpose                                             |
| ------------------------------- | --------------------------------------------------- |
| `npm run cli:download`          | Download the current nightly development CLI.       |
| `npm run cli:refresh -- [path]` | Copy a local build to the ignored target path.      |
| `npm run e2e`                   | Run every test against the target executable.       |
| `npm run e2e -- -t ogf`         | Run tests matching a name.                          |
| `npm run e2e:update`            | Record target executable behavior as new snapshots. |
