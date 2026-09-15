# create-shallot

The scaffold behind `bun create shallot`. It writes a fresh [Shallot](https://github.com/dylanebert/shallot) project: a `shallot.json` manifest, one plugin, a scene, and agent docs that point at the installed engine.

```bash
bun create shallot my-game
cd my-game
bun install
bun run build
```

The scaffold's own carrier is the qualified source candidate
`github:dylanebert/shallot#0664218f465224397b80aeb604b51178ac71cfb2` in its devDependencies.
The emitted application's normal persisted dependency remains the stable published
`@dylanebert/shallot@^0.9.5` range until that candidate is released.

## Developing

```bash
bun install --frozen-lockfile
bun run list
bun run workflow
bun run check
bun run test
bun run test -- --integration --base <parent> --diff <commit>
```

`list` reports the complete declared surface. `workflow` regenerates the hosted
`.github/workflows/test-surface.yml`; it must leave the working tree clean. `test` is the
bounded native unit command (this scaffold's checks are integrations), while
`test -- --integration` selects checks whose declared subject changed between the supplied
commits. A selector matching no row refuses rather than falling through to units. The generated
workflow runs install, check, test, and integration selection without knowing anything about this
package's product domain.

The carrier is a dev-only exact Git pin until Shallot 0.10 is released. The public preload is
loaded through `bunfig.toml`, and the package scripts above invoke the installed `shallot` bin;
no engine checkout or private engine script is needed after the frozen install.

### Against a local engine

The scaffold never imports the engine, but a scaffolded project does. To try an unreleased engine,
record both repositories' HEAD/dirt and the generated project's `package.json` and `bun.lock`
hashes. Register the producer, then enter locally without persisting a dependency mutation:

```bash
# in your Shallot checkout
bun link

# in the generated project
bun link @dylanebert/shallot --no-save
realpath node_modules/@dylanebert/shallot   # must equal the producer checkout
bun run build
```

A local link must leave the manifest and lock hashes unchanged. Exit with a newly empty cache,
then prove the installed package is not the producer and rerun the focused gate:

```bash
bun install --force --frozen-lockfile --cache-dir /tmp/empty-shallot-cache
bun run build
# in the Shallot checkout, when no longer needed
bun unlink
```

The generated project has its own concise contract in `AGENTS.md`; it persists the stable
published identity, not the scaffold's candidate.

## Releasing

Bump `version` in `package.json`, commit, and push a matching `v<version>` tag. The release workflow runs the native `bun run check` and `bun run test` gates before publishing. The integration surface remains a separate explicitly selected gate.

## License

MIT
