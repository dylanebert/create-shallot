import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { check } from "@dylanebert/shallot/harness/check";
import { QUALIFIED_SHALLOT_CANDIDATE } from "../src/index";

const CANDIDATE_SHA = "70770cfc34d82fdd19cb705d8753bb6f093748d6";
const STABLE_RANGE = "^0.9.5";

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

check(
    "scaffold candidate and generated stable application identities remain separate",
    {
        claim: "scaffold candidate and generated stable application identities remain separate through packed generation and frozen product gates",
        size: "integration",
        subject: [
            "package.json",
            "bun.lock",
            "AGENTS.md",
            "README.md",
            "shallot.json",
            "src/index.ts",
            "tests/package-preflight.test.ts",
            ".github/workflows/test-surface.yml",
        ],
        budget: 20000,
    },
    async () => {
        const root = process.cwd();
        const scaffoldManifest = jsonFile(resolve(root, "package.json"));
        const scaffoldLock = readFileSync(resolve(root, "bun.lock"), "utf8");
        if (
            dependency(scaffoldManifest, "devDependencies", "@dylanebert/shallot") !==
            QUALIFIED_SHALLOT_CANDIDATE
        ) {
            throw new Error(
                "scaffold package.json does not carry the qualified full-SHA candidate",
            );
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

        const packDir = mkdtempSync("/tmp/create-shallot-pack-");
        const creatorDir = mkdtempSync("/tmp/create-shallot-creator-");
        const appDir = resolve(creatorDir, "generated-app");
        const creatorCache = mkdtempSync("/tmp/create-shallot-cache-");
        const frozenCache = mkdtempSync("/tmp/create-shallot-frozen-cache-");
        try {
            const packed = runChecked(
                [process.execPath, "pm", "pack", "--destination", packDir, "--quiet"],
                root,
            );
            const artifactName = packed.stdout
                .trim()
                .split("\n")
                .find((line) => line.endsWith(".tgz"));
            if (artifactName === undefined)
                throw new Error("bun pm pack did not report an artifact");
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
            runChecked([process.execPath, "install", "--cache-dir", creatorCache], appDir);
            const appManifest = jsonFile(appManifestPath);
            if (dependency(appManifest, "dependencies", "@dylanebert/shallot") !== STABLE_RANGE) {
                throw new Error("generated application does not persist the stable Shallot range");
            }
            if (dependency(appManifest, "devDependencies", "@dylanebert/shallot") !== undefined) {
                throw new Error("generated application incorrectly carries the scaffold candidate");
            }
            for (const required of [".bun-version", "AGENTS.md", "shallot.json", "src/spin.ts"]) {
                if (!existsSync(resolve(appDir, required)))
                    throw new Error(`generated application omitted ${required}`);
            }
            const appLock = readFileSync(appLockPath, "utf8");
            if (
                appLock.includes("github:dylanebert/shallot") ||
                appLock.includes("link:") ||
                appLock.includes("file:")
            ) {
                throw new Error("generated lock contains a non-published Shallot identity");
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
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import shallot from "@dylanebert/shallot/package.json";
const root = import.meta.dir;
const installed = realpathSync(resolve(root, "node_modules/@dylanebert/shallot"));
if (!shallot.name || !/^0\\.9\\./.test(shallot.version)) throw new Error("stable Shallot identity is missing");
if (installed.includes("/shallot/")) throw new Error("generated app resolves an engine checkout");
if (!existsSync(resolve(root, "node_modules/.bin/shallot"))) throw new Error("installed Shallot bin is missing");
`;
            writeFileSync(resolve(appDir, "identity-probe.ts"), probe);
            runChecked([process.execPath, "identity-probe.ts"], appDir);
            rmSync(resolve(appDir, "identity-probe.ts"), { force: true });

            runChecked([process.execPath, "run", "check"], appDir);
            runChecked([process.execPath, "run", "build"], appDir);
            if (!existsSync(resolve(appDir, "dist")))
                throw new Error("generated build omitted dist/");

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
    },
);
