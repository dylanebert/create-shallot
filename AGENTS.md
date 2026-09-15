# create-shallot consumer contract

This repository publishes the `bun create shallot` scaffold. Admission is Bun 1.4.2 from
`.bun-version` and `packageManager`. Its own installed Shallot carrier is the qualified
source candidate `github:dylanebert/shallot#70770cfc34d82fdd19cb705d8753bb6f093748d6`,
recorded in `devDependencies` and `bun.lock`. The generated application's persisted
identity is deliberately separate: `@dylanebert/shallot@^0.9.5` is its stable published
range until the candidate is released.

## Supported states

- **Local co-development (uncommitted):** record producer and consumer HEAD/dirt plus
  consumer `package.json` and `bun.lock` hashes. In the Shallot producer run `bun link`;
  in this repository or a generated consumer run `bun link @dylanebert/shallot --no-save`.
  Prove the installed package realpath equals the producer and both consumer hashes stay
  unchanged. Exit with `bun install --force --frozen-lockfile --cache-dir <new-empty-cache>`;
  prove the installed candidate/stable identity, a non-producer realpath and no symlink or
  local-directory residue, then rerun the focused gate. Unlink the producer registration
  when it is no longer needed.
- **Source staging:** this scaffold's own gates persist the complete candidate Git SHA in
  the manifest and its lock resolution, and install frozen from a newly empty explicit
  cache. This is not the identity emitted into a new application.
- **Published exit:** a generated application persists the stable range and exact frozen
  lock resolution. It leaves local development only through the frozen clean-exit proof.

The installed `shallot` bin is the carrier. Use `bun run list`, `bun run check`, `bun run
test`, and `bun run workflow`; these do not reach an engine checkout or a private engine
script. Package preflight and generated-product build/check gates remain independent of the
carrier. Integration selectors must be non-empty; an empty selector refuses rather than
falling through to units.

The generated project must prove its own manifest, lock, `.bun-version`, `AGENTS.md`,
installed package metadata and realpath, and clean `shallot build`/`shallot check` behavior.
Its stable dependency must not become a saved `link:`, `file:`, local directory or Git
candidate. Temporary packs, caches and generated applications belong under `/tmp`.
