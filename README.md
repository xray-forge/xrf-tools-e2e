# xrf-tools-e2e

End-to-end suite for the `xrf-cli` command line application from
[xrf-tools](https://github.com/xray-forge/stalker-xrf-tools). Tests run real commands against a real gamedata
tree and snapshot everything the commands produced, so a change in behavior arrives as a reviewable diff rather than as
something noticed by hand.

It is plain Jest, laid out like `stalker-xrf-engine`: tooling in `cli/`, suite content in `src/`. Gutter icons, running a
single test, the debugger, `--watch`, and `-t` filtering all work the way they do everywhere else in the workspace.

## Running

```bash
npm install
npm run e2e
```

| Command                 | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `npm run e2e`           | Run every test against the committed binary.     |
| `npm run e2e -- -t ogf` | Run tests matching a name.                       |
| `npm run e2e:update`    | Record current behavior as the new snapshots.    |
| `npm run cli:refresh`   | Copy a freshly built CLI over the committed one. |

## Layout

| Path                      | Holds                                                     |
| ------------------------- | --------------------------------------------------------- |
| `src/tests/`              | The suite. One `*.test.ts` file per command or roundtrip. |
| `src/resources/gamedata/` | The committed gamedata tree, binary files through LFS.    |
| `cli/test/`               | Jest configuration and the helpers tests import.          |
| `cli/app/`                | The binary under test, committed.                         |
| `cli/refresh.mjs`         | Copies a freshly built CLI into `cli/app/`.               |
| `target/`                 | Test sandboxes, wiped per run. Not committed.             |

Imports use the same aliases as the engine: `#/*` resolves to `cli/*` and `@/*` to `src/*`.
