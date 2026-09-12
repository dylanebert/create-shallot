# create-shallot

The scaffold behind `bun create shallot`. It writes a fresh [Shallot](https://github.com/dylanebert/shallot) project: a `shallot.json` manifest, one plugin, a scene, and agent docs that point at the installed engine.

```bash
bun create shallot my-game
cd my-game
bun install
bunx shallot dev
```

The emitted `package.json` pins `@dylanebert/shallot` to the engine release this scaffold was checked against. Bump that range in `src/index.ts` when a new engine minor ships.

## Developing

```bash
bun install --frozen-lockfile
bun run list
bun run workflow
bun run check
bun run test
bun run test -- --integration -- --base <parent> --diff <commit>
```

`list` reports the complete declared surface. `workflow` regenerates the hosted
`.github/workflows/test-surface.yml`; it must leave the working tree clean. `test` is the
bounded native unit command (this scaffold's four checks are integrations), while
`test -- --integration` selects checks whose `src/index.ts` subject changed between the supplied
commits. The generated workflow runs install, check, test, and integration selection without
knowing anything about this package's product domain.

The carrier is a dev-only exact Git pin until Shallot 0.10 is released. The public preload is
loaded through `bunfig.toml`, and the package scripts above are the native carrier command
surface; no engine checkout is needed after the frozen install.

### Against a local engine

The scaffold never imports the engine, but a scaffolded project does. To try an unreleased engine, register your engine checkout and link it into a project the scaffold just wrote:

```bash
# in your shallot checkout
bun link

# here
bun src/index.ts /tmp/probe
cd /tmp/probe
bun install
bun link @dylanebert/shallot
bunx shallot build
```

Link after installing: a later `bun install` puts the published engine back. `bun unlink` in the engine checkout drops the registration.

## Releasing

Bump `version` in `package.json`, commit, and push a matching `v<version>` tag. The release workflow runs the native `bun run check` and `bun run test` gates before publishing. The integration surface remains a separate explicitly selected gate.

## License

MIT
