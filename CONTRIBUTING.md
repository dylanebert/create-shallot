# Contributing

For anyone changing the scaffold, person or agent. This page holds what the tree, the scripts and a failing check do not say.

```bash
bun install --frozen-lockfile
bun check
bun run lint
bun run test
bun test ./tests/package-preflight.node.ts
```

- The scaffold never imports the engine; a scaffolded project does. Both the scaffold's integration-test dependency and the project it writes use the published `^0.10.0-next.1` range.
- `bun run test` runs the cheap scaffold tests. The packed-consumer preflight is a named Node tier, run by path; there is no subject selector.
- To try an unreleased engine in a scaffolded project, install that candidate in the generated project, not here. Package states, linking and exit: [Shallot's CONTRIBUTING](https://github.com/dylanebert/shallot/blob/main/CONTRIBUTING.md#pins-and-dependencies).
- The generated app's `playwright.config.ts` builds and serves its own Vite preview; its `*.e2e.ts` checks run with `bun run test:browser`. The generated CI workflow runs `bun check` and the browser tier, and this repository's CI also scaffolds and tests an app against the published prerelease.
- A release is a `v<version>` tag matching `package.json`. The release workflow runs `bun check`, `bun run lint` and `bun run test` before publishing; CI also runs the named Node and generated-app browser tiers.
