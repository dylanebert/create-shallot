# Contributing

For anyone changing the scaffold, person or agent. This page holds what the tree, the scripts and a failing check do not say.

```bash
bun install --frozen-lockfile
bun run check
bun run test
bun run test -- --integration --base <ref> --diff <ref>   # tests whose subject changed
bun run list
bun run workflow   # regenerate the hosted surface; must leave the tree clean
```

- The scaffold never imports the engine; a scaffolded project does. The scaffold's own dev dependency is a full-SHA Git pin of Shallot until 0.10 is released. The project it writes depends on the stable published range, never on that pin.
- Every check here is an integration test, so `test` alone is empty and the changed-subject selector is the gate. A selector that matches no test fails.
- To try an unreleased engine in a scaffolded project, link it there, not here. Package states, linking and exit: [Shallot's CONTRIBUTING](https://github.com/dylanebert/shallot/blob/main/CONTRIBUTING.md#pins-and-dependencies).
- A release is a `v<version>` tag matching `package.json`. The release workflow runs `check` and `test` before publishing.
