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
