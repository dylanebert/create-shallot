import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main, scaffold, template } from "./index";

type Output = { stdout: string; stderr: string };

function captureOutput(run: () => unknown): Output & { value: unknown } {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const log = console.log;
    const error = console.error;
    console.log = (...args: unknown[]) => stdout.push(args.join(" "));
    console.error = (...args: unknown[]) => stderr.push(args.join(" "));
    try {
        return { value: run(), stdout: stdout.join("\n"), stderr: stderr.join("\n") };
    } finally {
        console.log = log;
        console.error = error;
    }
}

function temporaryRoot(prefix: string): string {
    return mkdtempSync(join(tmpdir(), prefix));
}

test("scaffold creates every declared project file and nested parent directory", () => {
    const scratch = temporaryRoot("shallot-scaffold-");
    const root = join(scratch, "project");
    const globalExcludes = join(scratch, "global-excludes");
    const globalConfig = join(scratch, "global.gitconfig");
    const initTemplate = join(scratch, "empty-template");
    mkdirSync(initTemplate);
    writeFileSync(globalExcludes, "dist/\n");
    writeFileSync(globalConfig, `[core]\n\texcludesFile = ${globalExcludes}\n`);
    const env: NodeJS.ProcessEnv = {
        ...process.env,
        HOME: scratch,
        XDG_CONFIG_HOME: scratch,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: globalConfig,
        GIT_CONFIG_COUNT: "0",
        GIT_CONFIG_PARAMETERS: "",
    };
    for (const key of [
        "GIT_DIR",
        "GIT_WORK_TREE",
        "GIT_COMMON_DIR",
        "GIT_INDEX_FILE",
        "GIT_OBJECT_DIRECTORY",
        "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    ])
        delete env[key];
    for (const key of Object.keys(env)) if (key.startsWith("GIT_CONFIG_KEY_")) delete env[key];
    const git = (...args: string[]) =>
        execFileSync("git", ["-C", root, ...args], { encoding: "utf8", env });
    try {
        scaffold(root, template("demo"));

        for (const rel of [
            "package.json",
            "index.html",
            "vite.config.ts",
            "playwright.config.ts",
            ".github/workflows/test.yml",
            "tests/project.test.ts",
            "tests/project.e2e.ts",
            "shallot.json",
            "public/icon.svg",
            "public/scenes/scene.scene",
        ]) {
            expect(existsSync(join(root, rel))).toBe(true);
        }
        expect(JSON.parse(readFileSync(join(root, "package.json"), "utf-8")).name).toBe("demo");
        for (const dir of ["dist", "build", ".artifacts"])
            mkdirSync(join(root, dir), { recursive: true });
        writeFileSync(join(root, "bun.lock"), "fixture\n");
        for (const file of ["dist/index.js", "build/app.js", ".artifacts/run"])
            writeFileSync(join(root, file), "fixture\n");
        git("init", "-q", `--template=${initTemplate}`);
        const ignored = git(
            "check-ignore",
            "-v",
            "dist/index.js",
            "build/app.js",
            ".artifacts/run",
        );
        const status = git("status", "--short", "--untracked-files=all");
        expect(ignored).toContain("build/app.js");
        expect(ignored).toContain(".artifacts/run");
        const distDecision = ignored.split("\n").find((line) => line.endsWith("dist/index.js"));
        expect(distDecision).toContain(".gitignore:");
        const ignorePath = join(root, ".gitignore");
        const ignore = readFileSync(ignorePath, "utf8");
        writeFileSync(ignorePath, ignore.replace(/^dist\/\n/m, ""));
        expect(git("check-ignore", "-v", "dist/index.js")).toContain(globalExcludes);
        expect(status).toContain("?? bun.lock");
        expect(status).toContain("?? src/spin.ts");
        expect(status).not.toContain("dist/");
        expect(status).not.toContain("build/");
        expect(status).not.toContain(".artifacts/");
    } finally {
        rmSync(scratch, { recursive: true, force: true });
    }
});

test("generated app owns Vite and declares its cheap and browser tiers", () => {
    const files = template("demo");
    const project = JSON.parse(files["package.json"]);
    const vite = files["vite.config.ts"];
    const ci = files[".github/workflows/test.yml"];

    expect(project.scripts.test).toBe("bun test --timeout=250");
    expect(project.scripts["test:browser"]).toBe("playwright test");
    expect(project.scripts.build).toBe("vite build");
    expect(project.scripts.check).toBe("tsc --noEmit");
    expect(project.dependencies["@dylanebert/shallot"]).toBe("^0.10.0-next.1");
    expect(project.devDependencies.vite).toBeDefined();
    expect(project.devDependencies["@types/bun"]).toBeDefined();
    expect(project.dependencies.typegpu).toBeUndefined();
    expect(project.devDependencies["unplugin-typegpu"]).toBeUndefined();
    expect(JSON.parse(files["tsconfig.json"]).extends).toBe("@dylanebert/shallot/tsconfig.json");
    expect(JSON.parse(files["tsconfig.json"]).include).toEqual(["src"]);
    expect(Object.keys(files).filter((path) => path.startsWith("tsconfig"))).toEqual([
        "tsconfig.json",
    ]);
    expect(files["tests/project.test.ts"]).not.toContain("typegpu");
    expect(files["tests/project.test.ts"]).not.toContain("@dylanebert/shallot");
    expect(files["bunfig.toml"]).toBeUndefined();
    expect(files["tests/preload.ts"]).toBeUndefined();
    expect(vite).toContain("plugins: [shallot()]");
    expect(vite).not.toContain("typegpu()");
    expect(vite).not.toContain("optimizeDeps");
    expect(vite).not.toContain("dedupe");
    expect(files["playwright.config.ts"]).toContain("globalTimeout:");
    expect(files["playwright.config.ts"]).toContain('channel: "chromium"');
    expect(files["playwright.config.ts"]).toContain("reuseExistingServer: false");
    expect(files["tests/project.test.ts"]).toContain("bun:test");
    expect(files["tests/project.e2e.ts"]).toContain("playwright/test");
    expect(ci).toContain("bun test --timeout=250");
    expect(ci).toContain("bun run test:browser");
    expect(files[".gitignore"]).toContain("test-results/");
});

test("generated project context points at installed consumer references, not contributor instructions", () => {
    const agents = template("demo")["AGENTS.md"];
    expect(agents).toContain("node_modules/@dylanebert/shallot/README.md");
    expect(agents).toContain("node_modules/@dylanebert/shallot/examples/first-person/");
    expect(agents).toContain("bun add @dylanebert/shallot");
    expect(agents).toContain("bun add --no-save <tarball>");
    expect(agents).toContain("bun link @dylanebert/shallot");
    expect(agents).toContain("bun install");
    expect(agents).not.toContain("bun link @dylanebert/shallot --no-save");
    expect(agents).not.toContain("HEAD/dirt");
    expect(agents).not.toContain("new-empty-cache");
    expect(agents).not.toContain("--frozen-lockfile");
    expect(agents).not.toContain("node_modules/@dylanebert/shallot/AGENTS.md");
    expect(agents).not.toContain("examples/AGENTS.md");
});

test("main refuses missing project names with usage output and a nonzero return code", () => {
    const output = captureOutput(() => main([]));
    expect(output.value).toBe(1);
    expect(output.stderr).toContain("Usage: bun create shallot <project-name>");
});

test("main refuses an existing target directory without overwriting it", () => {
    const root = temporaryRoot("shallot-create-");
    const existing = join(root, "existing");
    try {
        mkdirSync(existing);
        const output = captureOutput(() => main([existing]));
        expect(output.value).toBe(1);
        expect(output.stderr).toContain('Directory "');
        expect(existsSync(existing)).toBe(true);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("main reports successful creation and returns zero for a fresh project", () => {
    const root = temporaryRoot("shallot-create-");
    const project = join(root, "fresh-project");
    try {
        const output = captureOutput(() => main([project]));
        expect(output.value).toBe(0);
        expect(output.stdout).toContain("Created");
        expect(output.stdout).toContain("bun install");
        expect(existsSync(join(project, "shallot.json"))).toBe(true);
        expect(existsSync(join(project, "public/icon.svg"))).toBe(true);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
