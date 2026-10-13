# Contributing

For changing the `bun create shallot` shim. The package owns no scaffold files; Shallot's CLI owns project creation.

```bash
bun install --frozen-lockfile
bun check
bun run lint
bun run test
bun test ./tests/create.node.ts
```

- `src/index.ts` resolves the installed engine's declared `shallot` bin, invokes `shallot create`, forwards its arguments, and returns its exit status. Keep the package version and exact engine dependency version equal.
- `bun run test` runs the fast package-contract tests. The packed-consumer Node check is run by path; it packs the installed engine and this package, installs both tarballs, and compares default and first-person projects created by the shim and that engine's CLI.
- The packed-consumer check has a 120-second test timeout. It runs against the installed engine dependency, so install the matching engine release before running it.
- A release is a `v<version>` tag matching `package.json`. The release workflow runs `bun check`, `bun run lint` and `bun run test` before publishing; CI also runs the packed-consumer Node check.
