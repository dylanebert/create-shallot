#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";

const publishedShallotRange = "^0.10.0-next.1";

/**
 * The project files keyed by relative path, with the project name interpolated. The single source of
 * truth for `bun create shallot <name>`. The project owns its page, Vite config, tests and data; the
 * emitted AGENTS.md points an agent at the installed engine's consumer reference, and CLAUDE.md
 * imports it.
 */
export function template(name: string): Record<string, string> {
    return {
        "index.html": INDEX(name),
        "vite.config.ts": VITE_CONFIG,
        "playwright.config.ts": PLAYWRIGHT_CONFIG,
        ".github/workflows/test.yml": PROJECT_CI,
        "tests/project.test.ts": PROJECT_TEST,
        "tests/project.e2e.ts": BROWSER_TEST(name),
        "public/icon.svg": ICON,
        ".gitignore":
            "node_modules/\ndist/\nbuild/\n.artifacts/\ntest-results/\nplaywright-report/\n",
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
                        dev: "vite",
                        build: "vite build",
                        preview: "vite preview",
                        check: "tsc --noEmit",
                        test: "bun test --timeout=250",
                        "test:browser": "playwright test",
                    },
                    dependencies: {
                        "@dylanebert/shallot": publishedShallotRange,
                    },
                    devDependencies: {
                        "@types/bun": "^1.4.2",
                        "@types/node": "^26.2.0",
                        "@webgpu/types": "^0.1.72",
                        playwright: "^1.63.0",
                        typescript: "^7.0.2",
                        vite: "^8.3.0",
                    },
                },
                null,
                2,
            ) + "\n",
        "tsconfig.json":
            JSON.stringify(
                {
                    extends: "@dylanebert/shallot/tsconfig.json",
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
bun run dev
\`\`\`

The project owns \`index.html\` and \`vite.config.ts\`; the Shallot Vite plugin
loads the scene and project plugins from \`shallot.json\`. Edit \`src/spin.ts\` (a
plugin) and \`public/scenes/scene.scene\` (the scene) in your IDE.

## Verify

\`\`\`bash
bun run check
bun test
bun run test:browser
\`\`\`

The browser tier builds and previews this project with Vite before running
Playwright Test.

## Ship

\`\`\`bash
bun run build
bun run preview
\`\`\`

Builds a web bundle to \`dist/\` and previews it locally.
`;

const agents = (name: string) => `# ${name}

A WebGPU game built on \`@dylanebert/shallot\`.

## Package contract

Admission is Bun 1.4.2 from \`.bun-version\` and \`packageManager\`. The template stores
the published \`@dylanebert/shallot@${publishedShallotRange}\` range.

- Released: \`bun add @dylanebert/shallot\`.
- Staged: run \`bun pm pack\` in Shallot, then \`bun add --no-save <tarball>\` here.
- Live: run \`bun link\` in Shallot, then \`bun link @dylanebert/shallot\` here.
- Return to the manifest pin: \`bun install\`.

## Layout

- \`index.html\` and \`vite.config.ts\` — the app entry page and its Shallot Vite plugin
- \`shallot.json\` — the manifest: which scene to open + which plugins to enable
- \`public/scenes/*.scene\` — the world as declarative XML (each \`<a>\` is an entity, each attribute a component)
- \`src/*.ts\` — your plugins (a plugin is data: components + systems)

## Build, run and verify

\`\`\`bash
bun run dev
bun run build
bun run preview
bun run check
bun test
bun run test:browser
\`\`\`

Vite runs the project from its own config. The browser tier builds and previews this
project, then runs Playwright Test against that preview.

## Engine reference

The engine's README is the consumer reference. Read \`node_modules/@dylanebert/shallot/README.md\` for
setup guidance. Browse
\`node_modules/@dylanebert/shallot/examples/first-person/\` before writing a pattern from scratch.

## Conventions

Data-oriented, ECS, declarative. Add components and systems, not methods — a \`Jump\` marker plus a
system, never \`player.jump()\`. Scenes declare; code transforms. One source of truth: every value has
one authoritative home; derive, don't duplicate.
`;

// The project manifest is loaded by the Shallot Vite plugin through `virtual:project`. `scene` is the
// scene to open; `plugins` is enablement — "Orbit": true turns on the orbit camera the scene uses, and
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

const INDEX = (name: string) => `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <title>${name}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: #0c0a09; overflow: hidden; }
            canvas { display: block; width: 100vw; height: 100vh; }
        </style>
    </head>
    <body>
        <canvas id="canvas"></canvas>
        <script type="module">
            import { BrowserInputPlugin, run } from "@dylanebert/shallot";
            import project from "virtual:project";
            await run({
                plugins: [BrowserInputPlugin, ...project.plugins],
                scene: project.scene ?? undefined,
                defaults: false,
                capacity: project.capacity ?? undefined,
                pixelRatio: project.pixelRatio ?? undefined,
            });
            document.documentElement.dataset.shallotReady = "true";
        </script>
    </body>
</html>
`;

const VITE_CONFIG = `import { shallot } from "@dylanebert/shallot/vite";

export default {
    plugins: [shallot()],
};
`;

const PLAYWRIGHT_CONFIG = `import { fileURLToPath } from "node:url";
import type { PlaywrightTestConfig } from "playwright/test";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default {
    testDir: ".",
    testMatch: "**/*.e2e.ts",
    timeout: 20_000,
    // Measured locally at 2.4–3.7s; allow ~2× for CI while bounding a blowup.
    globalTimeout: 15_000,
    fullyParallel: false,
    workers: 1,
    reporter: "list",
    use: {
        browserName: "chromium",
        channel: "chromium",
        launchOptions: {
            args: [
                "--enable-unsafe-webgpu",
                "--enable-features=WebGPUDeveloperFeatures",
                "--enable-webgpu-developer-features",
                "--enable-gpu",
            ],
        },
        baseURL: "http://127.0.0.1:4173",
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
    },
    webServer: {
        command: \`bunx vite build "\${projectRoot}" --config "\${projectRoot}vite.config.ts" && bunx vite preview "\${projectRoot}" --config "\${projectRoot}vite.config.ts" --host 127.0.0.1 --port 4173 --strictPort\`,
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
        timeout: 120_000,
    },
} satisfies PlaywrightTestConfig;
`;

const PROJECT_CI = `name: test

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: .bun-version
      - run: bun install --frozen-lockfile
      - run: bun run check
      - run: bun test --timeout=250
      - run: bunx playwright install --with-deps chromium
      - run: bun run test:browser
`;

const PROJECT_TEST = `import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("manifest selects the starter scene and plugin", () => {
    const project = JSON.parse(readFileSync(new URL("../shallot.json", import.meta.url), "utf8"));

    expect(project.scene).toBe("scenes/scene.scene");
    expect(project.plugins.Spin).toBe("./src/spin");
});
`;

const BROWSER_TEST = (name: string) => `import { expect, test } from "playwright/test";

test("starts the scaffolded scene in an isolated browser page", async ({ page }) => {
    const response = await page.goto("/");

    expect(response?.ok()).toBe(true);
    expect(response?.headers()["cross-origin-opener-policy"]).toBe("same-origin");
    expect(response?.headers()["cross-origin-embedder-policy"]).toBe("require-corp");
    await expect(page).toHaveTitle(${JSON.stringify(name)});
    await expect(page.locator("canvas#canvas")).toBeVisible();
    expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("data-shallot-ready", "true");
});
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
