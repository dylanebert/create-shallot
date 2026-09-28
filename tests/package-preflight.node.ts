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

const PRODUCT_RANGE = "^0.10.0-next.1";
const PUBLISHED_VERSION = "0.10.0-next.1";

type CommandResult = { code: number; stdout: string; stderr: string };

function run(command: string[], cwd: string): CommandResult {
    const result = Bun.spawnSync(command, {
        cwd,
        env: process.env,
        stdout: "pipe",
        stderr: "pipe",
    });
    return {
        code: result.exitCode ?? 1,
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
    };
}

function runChecked(command: string[], cwd: string): CommandResult {
    const result = run(command, cwd);
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

function installedVersion(root: string): string {
    return String(jsonFile(resolve(root, "node_modules/@dylanebert/shallot/package.json")).version);
}

function runProjectScripts(root: string): void {
    runChecked([process.execPath, "run", "check"], root);
    runChecked([process.execPath, "test", "--timeout=250"], root);
    runChecked([process.execPath, "run", "build"], root);
    if (!existsSync(resolve(root, "dist"))) throw new Error("generated build omitted dist/");
}

test("packed scaffold installs and verifies a generated app against the published release, then a staged tarball when available", () => {
    const root = process.cwd();
    const scaffoldManifest = jsonFile(resolve(root, "package.json"));
    const scaffoldLock = readFileSync(resolve(root, "bun.lock"), "utf8");
    if (dependency(scaffoldManifest, "devDependencies", "@dylanebert/shallot") !== PRODUCT_RANGE) {
        throw new Error("scaffold devDependency does not carry the published prerelease range");
    }
    if (dependency(scaffoldManifest, "peerDependencies", "@dylanebert/shallot") !== PRODUCT_RANGE) {
        throw new Error("scaffold peerDependency does not carry the published prerelease range");
    }
    if (!scaffoldLock.includes(`@dylanebert/shallot@${PUBLISHED_VERSION}`)) {
        throw new Error("scaffold lockfile does not resolve the published prerelease");
    }
    if (readFileSync(resolve(root, ".bun-version"), "utf8").trim() !== "1.4.2") {
        throw new Error("scaffold does not admit its exact Bun version");
    }

    const candidate = realpathSync(resolve(root, "node_modules/@dylanebert/shallot"));
    const candidateVersion = installedVersion(root);
    const packDir = mkdtempSync(join(tmpdir(), "create-shallot-pack-"));
    const creatorDir = mkdtempSync(join(tmpdir(), "create-shallot-creator-"));
    const appDir = resolve(creatorDir, "generated-app");
    const creatorCache = mkdtempSync(join(tmpdir(), "create-shallot-cache-"));
    const appCache = mkdtempSync(join(tmpdir(), "create-shallot-app-cache-"));
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
        if (candidateName === undefined) throw new Error("Shallot pack omitted its artifact");
        const candidateArtifact = resolve(packDir, candidateName);

        const packed = runChecked(
            [process.execPath, "pm", "pack", "--destination", packDir, "--quiet"],
            root,
        );
        const artifactName = packed.stdout
            .trim()
            .split("\n")
            .find((line) => line.endsWith(".tgz"));
        if (artifactName === undefined) throw new Error("bun pm pack omitted its artifact");
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
            throw new Error("generated application does not persist the prerelease Shallot range");
        }
        if (dependency(appManifest, "devDependencies", "@dylanebert/shallot") !== undefined) {
            throw new Error("generated application incorrectly carries a Shallot devDependency");
        }
        if (dependency(appManifest, "devDependencies", "vite") === undefined) {
            throw new Error("generated application does not own Vite as a devDependency");
        }
        if (dependency(appManifest, "dependencies", "typegpu") !== undefined) {
            throw new Error("generated application declares unused TypeGPU");
        }
        if (dependency(appManifest, "devDependencies", "unplugin-typegpu") !== undefined) {
            throw new Error("generated application declares unplugin-typegpu");
        }
        if ((appManifest.scripts as Record<string, unknown>).check !== "tsc --noEmit") {
            throw new Error("generated check is not one tsc --noEmit pass");
        }
        if (dependency(appManifest, "devDependencies", "@types/bun") === undefined) {
            throw new Error("generated project does not own its Bun test types");
        }
        const generatedTsconfig = jsonFile(resolve(appDir, "tsconfig.json"));
        if (generatedTsconfig.extends !== "@dylanebert/shallot/tsconfig.json") {
            throw new Error("generated tsconfig does not extend Shallot's base");
        }
        if (JSON.stringify(generatedTsconfig.include) !== JSON.stringify(["src"])) {
            throw new Error("generated tsconfig does not own its src include");
        }
        if (existsSync(resolve(appDir, "tsconfig.node.json"))) {
            throw new Error("generated app has a second tsconfig");
        }
        if (
            existsSync(resolve(appDir, "bunfig.toml")) ||
            existsSync(resolve(appDir, "tests/preload.ts"))
        ) {
            throw new Error("generated app added an unnecessary TGSL preload to non-TGSL tests");
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

        runChecked([process.execPath, "install", "--cache-dir", appCache], appDir);
        if (installedVersion(appDir) !== PUBLISHED_VERSION) {
            throw new Error(`generated app did not install the published ${PUBLISHED_VERSION}`);
        }
        if (
            !existsSync(resolve(appDir, "node_modules/@dylanebert/shallot/examples/first-person"))
        ) {
            throw new Error("generated project context points at an unavailable example");
        }
        const beforeStageManifest = hash(appManifestPath);
        const beforeStageLock = hash(appLockPath);
        runProjectScripts(appDir);

        // On the staged check, the root overlay has installed main's next.2 in node_modules.
        // Pack that installed package and exercise the generated app through Bun's no-save overlay.
        // The regular prerelease check sees next.1, where a same-version pack cannot prove overlay.
        if (candidateVersion !== PUBLISHED_VERSION) {
            runChecked([process.execPath, "add", "--no-save", candidateArtifact], appDir);
            if (
                hash(appManifestPath) !== beforeStageManifest ||
                hash(appLockPath) !== beforeStageLock
            ) {
                throw new Error("staged app overlay changed its package.json or bun.lock");
            }
            if (installedVersion(appDir) !== candidateVersion) {
                throw new Error(`staged app did not install Shallot ${candidateVersion}`);
            }
            runProjectScripts(appDir);

            runChecked([process.execPath, "install", "--cache-dir", appCache], appDir);
            if (
                hash(appManifestPath) !== beforeStageManifest ||
                hash(appLockPath) !== beforeStageLock
            ) {
                throw new Error(
                    "app install changed its package.json or bun.lock while restoring pin",
                );
            }
            if (installedVersion(appDir) !== PUBLISHED_VERSION) {
                throw new Error("app install did not restore the published prerelease");
            }
            runProjectScripts(appDir);
        }

        const agents = readFileSync(resolve(appDir, "AGENTS.md"), "utf8");
        if (!agents.includes("bun link @dylanebert/shallot --no-save"))
            throw new Error("generated contract omitted no-save local entry");
        if (agents.includes("@dylanebert/shallot/scripts"))
            throw new Error("generated contract reaches a private engine script");
    } finally {
        rmSync(packDir, { recursive: true, force: true });
        rmSync(creatorDir, { recursive: true, force: true });
        rmSync(creatorCache, { recursive: true, force: true });
        rmSync(appCache, { recursive: true, force: true });
    }
}, 120_000);
