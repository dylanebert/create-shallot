# Contributing

For anyone changing the scaffold, person or agent. This page holds what the tree, the scripts and a failing check do not say.

```bash
bun install --frozen-lockfile
bun run check
bun test --timeout=250
bun test ./tests/package-preflight.node.ts
```

- The scaffold never imports the engine; a scaffolded project does. The scaffold's dev dependency is the full-SHA candidate pin. The project it writes stores the upcoming `^0.10.0` release range, never that pin.
- `bun test --timeout=250` runs the cheap scaffold tests. The packed-consumer preflight is a named Node tier, run by path; there is no subject selector.
- To try an unreleased engine in a scaffolded project, install that candidate in the generated project, not here. Package states, linking and exit: [Shallot's CONTRIBUTING](https://github.com/dylanebert/shallot/blob/main/CONTRIBUTING.md#pins-and-dependencies).
- The generated app's `playwright.config.ts` builds and serves its own Vite preview; its `*.e2e.ts` checks run with `bun run test:browser`. The generated CI workflow runs both app tiers, and this repository's CI also scaffolds and tests a fresh candidate app.
- A release is a `v<version>` tag matching `package.json`. The release workflow runs `check` and the cheap `test` tier before publishing; CI also runs the named Node and generated-app browser tiers.
