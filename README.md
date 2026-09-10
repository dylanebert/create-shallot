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
bun install
bun run check   # tsc + Biome
bun run test    # scaffold unit tests
```

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

Bump `version` in `package.json`, commit, and push a matching `v<version>` tag. The release workflow checks, tests and publishes with the `NPM_TOKEN` repository secret.

## License

MIT
