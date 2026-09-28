# create-shallot

the scaffold behind `bun create shallot`. it writes a fresh [shallot](https://github.com/dylanebert/shallot)
project with its own `index.html` and Vite config, a manifest and plugin, Bun and
Playwright checks, and an agent contract that points at the installed engine.

```bash
bun create shallot my-game
cd my-game
bun install
bun run dev
```

changing it: [`CONTRIBUTING.md`](CONTRIBUTING.md). mit.
