#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";

// The generated application stays on the stable published contract until a release exists. The
// scaffold itself carries the qualified source candidate in its devDependencies (see package.json).
const publishedShallotRange = "^0.9.5";
export const QUALIFIED_SHALLOT_CANDIDATE =
    "github:dylanebert/shallot#0664218f465224397b80aeb604b51178ac71cfb2";

/**
 * the project files keyed by relative path, with the project name interpolated. the single source of
 * truth for `bun create shallot <name>`.
 *
 * the project is pure data — a `shallot.json` manifest + plugin modules + `public/`, no vite
 * boilerplate. the CLI provides every harness over it: `shallot dev` runs it standalone with hot
 * reload, `shallot build` ships it (web + native targets). the emitted AGENTS.md points an agent at
 * the installed engine's contract, and CLAUDE.md imports it.
 */
export function template(name: string): Record<string, string> {
    return {
        "public/icon.svg": ICON,
        ".gitignore": "node_modules/\ndist/\nbuild/\n.artifacts/\n",
        ".bun-version": "1.4.2\n",
        "package.json":
            JSON.stringify(
                {
                    name,
                    version: "0.0.0",
                    private: true,
                    type: "module",
                    packageManager: "bun@1.4.2",
                    engines: { bun: ">=1.4.2" },
                    scripts: {
                        build: "shallot build",
                        check: "tsc --noEmit",
                    },
                    dependencies: {
                        "@dylanebert/shallot": publishedShallotRange,
                        typegpu: "~0.12.5",
                    },
                    devDependencies: {
                        "@types/node": "^26.2.0",
                        "@webgpu/types": "^0.1.72",
                        typescript: "^7.0.2",
                    },
                },
                null,
                2,
            ) + "\n",
        "tsconfig.json":
            JSON.stringify(
                {
                    compilerOptions: {
                        target: "ESNext",
                        module: "ESNext",
                        moduleResolution: "bundler",
                        lib: ["ESNext", "DOM", "DOM.Iterable"],
                        types: ["@webgpu/types", "node", "vite/client"],
                        strict: true,
                        noEmit: true,
                        skipLibCheck: true,
                    },
                    include: ["src"],
                },
                null,
                2,
            ) + "\n",
        "shallot.json": MANIFEST,
        "src/env.d.ts": ENV,
        "src/spin.ts": SPIN,
        "public/scenes/scene.scene": SCENE,
        "README.md": readme(name),
        "AGENTS.md": agents(name),
        "CLAUDE.md": CLAUDE_IMPORT,
    };
}

// one contract, two entrypoints: Codex reads AGENTS.md, Claude Code reads CLAUDE.md and expands the
// `@`-import. An import, not a symlink — a Windows checkout without developer mode gets a literal
// text file from a symlink. The trailing sentence is the cost of that choice: the import expands only
// for a session rooted in this file's own directory, so opened from a parent the line is literal text
// and the prose pointer is all the reader gets. Kept identical to the copy-out's stanza in
// `bin/scaffold.ts`.
const CLAUDE_IMPORT = `@AGENTS.md

If the import line above is showing as literal text, this file was loaded from a parent directory; read the AGENTS.md next to this file before working here.
`;

/** write a template file map under dir, creating parent directories as needed. */
export function scaffold(dir: string, files: Record<string, string>): void {
    for (const [rel, content] of Object.entries(files)) {
        const path = join(dir, rel);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, content);
    }
}

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 14" width="12" height="14" shape-rendering="crispEdges"><rect x="5" y="1" width="1" height="1" fill="#d49560"/><rect x="6" y="1" width="1" height="1" fill="#d49560"/><rect x="5" y="2" width="1" height="1" fill="#d49560"/><rect x="6" y="2" width="1" height="1" fill="#d49560"/><rect x="4" y="3" width="1" height="1" fill="#d49560"/><rect x="5" y="3" width="1" height="1" fill="#d49560"/><rect x="6" y="3" width="1" height="1" fill="#d49560"/><rect x="7" y="3" width="1" height="1" fill="#d49560"/><rect x="4" y="4" width="1" height="1" fill="#d49560"/><rect x="5" y="4" width="1" height="1" fill="#d49560"/><rect x="6" y="4" width="1" height="1" fill="#d49560"/><rect x="7" y="4" width="1" height="1" fill="#d49560"/><rect x="3" y="5" width="1" height="1" fill="#d49560"/><rect x="4" y="5" width="1" height="1" fill="#d49560"/><rect x="5" y="5" width="1" height="1" fill="#d49560"/><rect x="6" y="5" width="1" height="1" fill="#d49560"/><rect x="7" y="5" width="1" height="1" fill="#d49560"/><rect x="8" y="5" width="1" height="1" fill="#d49560"/><rect x="2" y="6" width="1" height="1" fill="#d49560"/><rect x="3" y="6" width="1" height="1" fill="#d49560"/><rect x="4" y="6" width="1" height="1" fill="#d49560"/><rect x="5" y="6" width="1" height="1" fill="#d49560"/><rect x="6" y="6" width="1" height="1" fill="#d49560"/><rect x="7" y="6" width="1" height="1" fill="#d49560"/><rect x="8" y="6" width="1" height="1" fill="#d49560"/><rect x="9" y="6" width="1" height="1" fill="#d49560"/><rect x="1" y="7" width="1" height="1" fill="#d49560"/><rect x="2" y="7" width="1" height="1" fill="#d49560"/><rect x="3" y="7" width="1" height="1" fill="#d49560"/><rect x="4" y="7" width="1" height="1" fill="#d49560"/><rect x="5" y="7" width="1" height="1" fill="#d49560"/><rect x="6" y="7" width="1" height="1" fill="#d49560"/><rect x="7" y="7" width="1" height="1" fill="#d49560"/><rect x="8" y="7" width="1" height="1" fill="#d49560"/><rect x="9" y="7" width="1" height="1" fill="#d49560"/><rect x="10" y="7" width="1" height="1" fill="#d49560"/><rect x="0" y="8" width="1" height="1" fill="#d49560"/><rect x="1" y="8" width="1" height="1" fill="#d49560"/><rect x="2" y="8" width="1" height="1" fill="#d49560"/><rect x="3" y="8" width="1" height="1" fill="#d49560"/><rect x="4" y="8" width="1" height="1" fill="#d49560"/><rect x="5" y="8" width="1" height="1" fill="#d49560"/><rect x="6" y="8" width="1" height="1" fill="#d49560"/><rect x="7" y="8" width="1" height="1" fill="#d49560"/><rect x="8" y="8" width="1" height="1" fill="#d49560"/><rect x="9" y="8" width="1" height="1" fill="#d49560"/><rect x="10" y="8" width="1" height="1" fill="#d49560"/><rect x="11" y="8" width="1" height="1" fill="#d49560"/><rect x="0" y="9" width="1" height="1" fill="#d49560"/><rect x="1" y="9" width="1" height="1" fill="#d49560"/><rect x="2" y="9" width="1" height="1" fill="#d49560"/><rect x="3" y="9" width="1" height="1" fill="#d49560"/><rect x="4" y="9" width="1" height="1" fill="#d49560"/><rect x="5" y="9" width="1" height="1" fill="#d49560"/><rect x="6" y="9" width="1" height="1" fill="#d49560"/><rect x="7" y="9" width="1" height="1" fill="#d49560"/><rect x="8" y="9" width="1" height="1" fill="#d49560"/><rect x="9" y="9" width="1" height="1" fill="#d49560"/><rect x="10" y="9" width="1" height="1" fill="#d49560"/><rect x="11" y="9" width="1" height="1" fill="#d49560"/><rect x="0" y="10" width="1" height="1" fill="#d49560"/><rect x="1" y="10" width="1" height="1" fill="#d49560"/><rect x="2" y="10" width="1" height="1" fill="#d49560"/><rect x="3" y="10" width="1" height="1" fill="#d49560"/><rect x="4" y="10" width="1" height="1" fill="#d49560"/><rect x="5" y="10" width="1" height="1" fill="#d49560"/><rect x="6" y="10" width="1" height="1" fill="#d49560"/><rect x="7" y="10" width="1" height="1" fill="#d49560"/><rect x="8" y="10" width="1" height="1" fill="#d49560"/><rect x="9" y="10" width="1" height="1" fill="#d49560"/><rect x="10" y="10" width="1" height="1" fill="#d49560"/><rect x="11" y="10" width="1" height="1" fill="#d49560"/><rect x="1" y="11" width="1" height="1" fill="#d49560"/><rect x="2" y="11" width="1" height="1" fill="#d49560"/><rect x="3" y="11" width="1" height="1" fill="#d49560"/><rect x="4" y="11" width="1" height="1" fill="#d49560"/><rect x="5" y="11" width="1" height="1" fill="#d49560"/><rect x="6" y="11" width="1" height="1" fill="#d49560"/><rect x="7" y="11" width="1" height="1" fill="#d49560"/><rect x="8" y="11" width="1" height="1" fill="#d49560"/><rect x="9" y="11" width="1" height="1" fill="#d49560"/><rect x="10" y="11" width="1" height="1" fill="#d49560"/><rect x="2" y="12" width="1" height="1" fill="#d49560"/><rect x="3" y="12" width="1" height="1" fill="#d49560"/><rect x="4" y="12" width="1" height="1" fill="#d49560"/><rect x="5" y="12" width="1" height="1" fill="#d49560"/><rect x="6" y="12" width="1" height="1" fill="#d49560"/><rect x="7" y="12" width="1" height="1" fill="#d49560"/><rect x="8" y="12" width="1" height="1" fill="#d49560"/><rect x="9" y="12" width="1" height="1" fill="#d49560"/></svg>
`;

const readme = (name: string) => `# ${name}

A Shallot project.

## Develop

\`\`\`bash
bun install
bun run build
\`\`\`

\`bun install\` fetches the stable published engine. \`bun run build\` invokes the
installed Shallot carrier. Edit \`src/spin.ts\` (a plugin) and \`shallot.json\` (the
manifest: scene + plugin enablement) in your IDE. The generated project keeps its
stable dependency in the manifest; candidate work enters only through the local
no-save link described in \`AGENTS.md\`.

## Ship

\`\`\`bash
bun run build
\`\`\`

Builds a web bundle to \`dist/\`. Native targets
(\`--target windows|mac|linux\`) download a prebuilt release shell when one exists
for your installed version, and otherwise fall back to compiling from source,
which needs the Rust toolchain and target system dependencies; see the installed
engine's README for the per-target table.
`;

const agents = (name: string) => `# ${name}

A WebGPU game built on \`@dylanebert/shallot\`.

## Package contract

Admission is Bun 1.4.2 from \`.bun-version\` and \`packageManager\`. The persisted
application identity is the stable published \`@dylanebert/shallot@^0.9.5\` range and
its frozen lock resolution. The scaffold's unreleased candidate is not written into
the generated application.

For local co-development only, record the producer and consumer HEAD/dirt plus the
consumer manifest and lock hashes. In the Shallot checkout run \`bun link\`; here run
\`bun link @dylanebert/shallot --no-save\`. Prove the installed package realpath is
the producer. Exit with \`bun install --force --frozen-lockfile --cache-dir <new-empty-cache>\`,
prove the stable installed identity and that no producer symlink or local-directory
residue remains, then rerun the focused gate. A link never changes the manifest or lock.

## Layout

- \`shallot.json\` — the manifest: which scene to open + which plugins to enable
- \`public/scenes/*.scene\` — the world as declarative XML (each \`<a>\` is an entity, each attribute a component)
- \`src/*.ts\` — your plugins (a plugin is data: components + systems)

## Build and inspect

\`\`\`bash
bun run check                                   # independent project typecheck
bun run build                                   # installed Shallot carrier, web bundle to dist/
\`\`\`

These are the product gates. The build invokes the installed Shallot bin and neither
gate reads an engine checkout or a private engine script. If a future rendered claim
needs a browser witness, add the public capture contract and an admitted integration
row rather than inventing a project-local transport.

## Engine reference

The engine is the documentation. Read \`node_modules/@dylanebert/shallot/AGENTS.md\` for the full
contract (ECS, plugins, scenes, GPU, UI), and every public export carries JSDoc. Read the installed
examples index before writing a pattern from scratch.

## Conventions

Data-oriented, ECS, declarative. Add components and systems, not methods — a \`Jump\` marker plus a
system, never \`player.jump()\`. Scenes declare; code transforms. One source of truth: every value has
one authoritative home; derive, don't duplicate.
`;

// The project manifest: `shallot dev` and a shipped `shallot build` both read it. `scene` is the scene
// to open; `plugins` is enablement — "Orbit": true turns on the orbit camera the scene uses, and
// "Spin": "./src/spin" declares our own plugin by its module path. The default plugins (render, lit
// surface) are on unless you set one false.
const MANIFEST = `{
  "$schema": "./node_modules/@dylanebert/shallot/shallot.schema.json",
  "scene": "scenes/scene.scene",
  "plugins": {
    "Orbit": true,
    "Spin": "./src/spin"
  }
}
`;

// Ambient types + the tsconfig anchor. `include: ["src"]` needs at least one matching file, so this
// keeps the generated `bun run check` green (no TS18003) even when spin.ts is deleted for a static scene. It's
// infrastructure, not demo content — don't delete it.
const ENV = `/// <reference types="@webgpu/types" />
`;

const SPIN = `import { type Plugin, type State, type System, Part, quat, Transform } from "@dylanebert/shallot";

// A plugin is plain data: components + systems the engine runs. This system spins every Part around Y.
// It runs in the "simulation" group, which plays when the project runs. Delete this file (and its
// \`shallot.json\` entry) for a static scene.
const SpinSystem: System = {
    group: "simulation",
    update(state: State) {
        // Derive the angle from elapsed time, not a module-level accumulator, so it stays
        // correct after a hot reload or State rebuild rather than carrying stale rotation.
        const q = quat(0, (state.time.elapsed * 45) % 360, 0);
        for (const eid of state.query([Part, Transform])) {
            Transform.rot.set(eid, q.x, q.y, q.z, q.w);
        }
    },
};

// The default export is the plugin — \`shallot.json\` references this file by path and imports
// its default. The name ("Spin") is how the manifest lists it.
const SpinPlugin: Plugin = { name: "Spin", systems: [SpinSystem] };
export default SpinPlugin;
`;

const SCENE = `<scene>
    <a ambient-light="color: 0xd0dcec; intensity: 0.5" />
    <a directional-light="direction: -0.4 -1 -0.55; color: 0xfff4e0; intensity: 1.1" />

    <!-- the camera auto-binds to the page's <canvas>; drag to orbit, scroll to zoom -->
    <a camera sear orbit="distance: 5; yaw: 0.6; pitch: 0.25" transform />

    <!-- a Part is the engine's drop-in renderable: a mesh (default "cube") wearing a surface (default "default", lit) -->
    <a part transform="pos: 0 0 0" color="rgba: 0.85 0.55 0.35 1" />
</scene>
`;

/** `bun create shallot <project-name>` — parse argv, guard the target dir, scaffold, report next steps.
 *  Returns the process exit code rather than calling `process.exit` itself, so it's callable directly. */
export function main(argv: string[]): number {
    const name = argv.find((a) => !a.startsWith("--"));
    if (!name) {
        console.error("Usage: bun create shallot <project-name>");
        return 1;
    }

    const dir = resolve(name);
    if (existsSync(dir)) {
        console.error(`Directory "${name}" already exists`);
        return 1;
    }

    scaffold(dir, template(name));

    console.log(`Created ${name}/`);
    console.log();
    console.log("Next steps:");
    console.log(`  cd ${name}`);
    console.log("  bun install");
    console.log("  bun run build");
    return 0;
}

if (import.meta.main) {
    process.exit(main(process.argv.slice(2)));
}
