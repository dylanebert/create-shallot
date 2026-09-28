import { test } from "bun:test";
import {
    existsSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { QUALIFIED_SHALLOT_CANDIDATE } from "../src/index";

const CANDIDATE_SHA = "49fbfcbe4b8d00673b2798c96ae25bbefa5f6060";
const PRODUCT_RANGE = "^0.10.0";

type CommandResult = { code: number; stdout: string; stderr: string };

function run(command: string[], cwd: string, env?: Record<string, string>): CommandResult {
    const result = Bun.spawnSync(command, {
        cwd,
        env: { ...process.env, ...env },
        stdout: "pipe",
        stderr: "pipe",
    });
    return {
        code: result.exitCode ?? 1,
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
    };
}

function runChecked(command: string[], cwd: string, env?: Record<string, string>): CommandResult {
    const result = run(command, cwd, env);
    if (result.code !== 0) {
        throw new Error(
            `${command.join(" ")} failed with ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
        );
    }
    return result;
}

function jsonFile(path: string): Record<string, unknown> {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function hash(path: string): string {
    const digest = new Bun.CryptoHasher("sha256");
    digest.update(readFileSync(path));
    return digest.digest("hex");
}

function dependency(manifest: Record<string, unknown>, section: string, name: string): unknown {
    return (manifest[section] as Record<string, unknown> | undefined)?.[name];
}

test("packed scaffold separates candidate and product identities and the generated candidate app passes its cheap gate and builds", async () => {
    const root = process.cwd();
    const scaffoldManifest = jsonFile(resolve(root, "package.json"));
    const scaffoldLock = readFileSync(resolve(root, "bun.lock"), "utf8");
    if (
        dependency(scaffoldManifest, "devDependencies", "@dylanebert/shallot") !==
        QUALIFIED_SHALLOT_CANDIDATE
    ) {
        throw new Error("scaffold package.json does not carry the qualified full-SHA candidate");
    }
    if (
        !scaffoldLock.includes(
            `@dylanebert/shallot@github:dylanebert/shallot#${CANDIDATE_SHA.slice(0, 7)}`,
        )
    ) {
        throw new Error("scaffold bun.lock does not resolve the qualified candidate");
    }
    if (readFileSync(resolve(root, ".bun-version"), "utf8").trim() !== "1.4.2") {
        throw new Error("scaffold does not admit its exact Bun version");
    }

    const candidate = realpathSync(resolve(root, "node_modules/@dylanebert/shallot"));
    const packDir = mkdtempSync(join(tmpdir(), "create-shallot-pack-"));
    const creatorDir = mkdtempSync(join(tmpdir(), "create-shallot-creator-"));
    const appDir = resolve(creatorDir, "generated-app");
    const creatorCache = mkdtempSync(join(tmpdir(), "create-shallot-cache-"));
    const frozenCache = mkdtempSync(join(tmpdir(), "create-shallot-frozen-cache-"));
    try {
        const candidatePacked = runChecked(
            [
                process.execPath,
                "pm",
                "pack",
                "--ignore-scripts",
                "--destination",
                packDir,
                "--quiet",
            ],
            candidate,
        );
        const candidateName = candidatePacked.stdout
            .trim()
            .split("\n")
            .find((line) => line.endsWith(".tgz"));
        if (candidateName === undefined)
            throw new Error("candidate pack did not report an artifact");
        const candidateArtifact = resolve(packDir, candidateName);
        const packed = runChecked(
            [process.execPath, "pm", "pack", "--destination", packDir, "--quiet"],
            root,
        );
        const artifactName = packed.stdout
            .trim()
            .split("\n")
            .find((line) => line.endsWith(".tgz"));
        if (artifactName === undefined) throw new Error("bun pm pack did not report an artifact");
        const artifact = resolve(packDir, artifactName);
        const archive = runChecked(["tar", "-tzf", artifact], root).stdout.split("\n");
        for (const entry of ["package/package.json", "package/src/index.ts"]) {
            if (!archive.includes(entry)) throw new Error(`package preflight omitted ${entry}`);
        }
        if (archive.includes("package/src/index.test.ts")) {
            throw new Error("package preflight included the scaffold's test implementation");
        }

        writeFileSync(
            resolve(creatorDir, "package.json"),
            `${JSON.stringify(
                {
                    name: "create-shallot-preflight",
                    private: true,
                    packageManager: "bun@1.4.2",
                    devDependencies: { "create-shallot": `file:${artifact}` },
                },
                null,
                2,
            )}\n`,
        );
        runChecked([process.execPath, "install", "--cache-dir", creatorCache], creatorDir);
        const creatorBin = resolve(creatorDir, "node_modules/.bin/create-shallot");
        if (!existsSync(creatorBin)) throw new Error("packed scaffold did not install its bin");
        runChecked([process.execPath, creatorBin, appDir], creatorDir);

        const appManifestPath = resolve(appDir, "package.json");
        const appLockPath = resolve(appDir, "bun.lock");
        const appManifest = jsonFile(appManifestPath);
        if (dependency(appManifest, "dependencies", "@dylanebert/shallot") !== PRODUCT_RANGE) {
            throw new Error("generated application does not persist the product Shallot range");
        }
        if (dependency(appManifest, "devDependencies", "@dylanebert/shallot") !== undefined) {
            throw new Error("generated application incorrectly carries the scaffold candidate");
        }
        if (dependency(appManifest, "devDependencies", "vite") === undefined) {
            throw new Error("generated application does not own Vite as a devDependency");
        }
        if (dependency(appManifest, "devDependencies", "playwright") === undefined) {
            throw new Error("generated application does not own Playwright as a devDependency");
        }
        for (const required of [
            ".bun-version",
            "AGENTS.md",
            ".github/workflows/test.yml",
            "index.html",
            "playwright.config.ts",
            "shallot.json",
            "src/spin.ts",
            "tests/project.test.ts",
            "tests/project.e2e.ts",
            "vite.config.ts",
        ]) {
            if (!existsSync(resolve(appDir, required)))
                throw new Error(`generated application omitted ${required}`);
        }
        const viteConfig = readFileSync(resolve(appDir, "vite.config.ts"), "utf8");
        if (!viteConfig.includes('import { shallot } from "@dylanebert/shallot/vite"')) {
            throw new Error("generated Vite config does not install the Shallot plugin");
        }

        const candidateManifest = {
            ...appManifest,
            dependencies: {
                ...(appManifest.dependencies as Record<string, unknown>),
                "@dylanebert/shallot": `file:${candidateArtifact}`,
            },
        };
        writeFileSync(appManifestPath, `${JSON.stringify(candidateManifest, null, 2)}\n`);
        runChecked([process.execPath, "install", "--cache-dir", creatorCache], appDir);
        const installedManifest = jsonFile(appManifestPath);
        const installedShallot = dependency(
            installedManifest,
            "dependencies",
            "@dylanebert/shallot",
        );
        if (installedShallot !== `file:${candidateArtifact}`) {
            throw new Error("candidate install did not stay local to the generated app");
        }
        if (
            !existsSync(resolve(appDir, "node_modules/@dylanebert/shallot/examples/first-person"))
        ) {
            throw new Error("generated project context points at an unavailable example");
        }
        const beforeManifest = hash(appManifestPath);
        const beforeLock = hash(appLockPath);

        rmSync(resolve(appDir, "node_modules"), { recursive: true, force: true });
        runChecked(
            [
                process.execPath,
                "install",
                "--force",
                "--frozen-lockfile",
                "--cache-dir",
                frozenCache,
            ],
            appDir,
        );
        if (hash(appManifestPath) !== beforeManifest || hash(appLockPath) !== beforeLock) {
            throw new Error("frozen generated-app install changed its manifest or lock");
        }

        const probe = `
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const root = import.meta.dir;
const installed = JSON.parse(readFileSync(resolve(root, "node_modules/@dylanebert/shallot/package.json"), "utf8"));
if (installed.version !== "0.10.0") throw new Error("candidate identity is missing");
if (!existsSync(resolve(root, "node_modules/.bin/shallot"))) throw new Error("installed Shallot bin is missing");
`;
        writeFileSync(resolve(appDir, "identity-probe.ts"), probe);
        runChecked([process.execPath, "identity-probe.ts"], appDir);
        rmSync(resolve(appDir, "identity-probe.ts"), { force: true });

        runChecked([process.execPath, "test", "--timeout=250"], appDir);
        runChecked([process.execPath, "run", "check"], appDir);
        runChecked([process.execPath, "run", "build"], appDir);
        if (!existsSync(resolve(appDir, "dist"))) throw new Error("generated build omitted dist/");

        const agents = readFileSync(resolve(appDir, "AGENTS.md"), "utf8");
        if (!agents.includes("bun link @dylanebert/shallot --no-save"))
            throw new Error("generated contract omitted no-save local entry");
        if (agents.includes("@dylanebert/shallot/scripts"))
            throw new Error("generated contract reaches a private engine script");
    } finally {
        rmSync(packDir, { recursive: true, force: true });
        rmSync(creatorDir, { recursive: true, force: true });
        rmSync(creatorCache, { recursive: true, force: true });
        rmSync(frozenCache, { recursive: true, force: true });
    }
}, 30_000); // Five runs: 14.6–17.3s, median 15.1s; ~2× median for CI.
