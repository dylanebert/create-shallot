import { expect, test } from "bun:test";
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

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

function packedArtifact(cwd: string, destination: string): string {
    const result = runChecked(
        [
            process.execPath,
            "pm",
            "pack",
            "--ignore-scripts",
            "--destination",
            destination,
            "--quiet",
        ],
        cwd,
    );
    const filename = result.stdout
        .trim()
        .split("\n")
        .find((line) => line.endsWith(".tgz"));
    if (filename === undefined) throw new Error(`bun pm pack in ${cwd} omitted its tarball`);
    return resolve(destination, filename);
}

function packageManifest(root: string): Record<string, unknown> {
    return JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
}

function listFiles(root: string, directory = root): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? listFiles(root, path) : [relative(root, path)];
    });
}

function expectSameTree(left: string, right: string): void {
    const leftFiles = listFiles(left).sort();
    const rightFiles = listFiles(right).sort();
    expect(rightFiles).toEqual(leftFiles);
    for (const path of leftFiles) {
        expect(readFileSync(resolve(right, path))).toEqual(readFileSync(resolve(left, path)));
    }
}

test("packed shim creates byte-identical default and first-person projects to its packed engine", () => {
    const root = process.cwd();
    const creatorManifest = packageManifest(root);
    const engineRoot = realpathSync(resolve(root, "node_modules/@dylanebert/shallot"));
    const engineManifest = packageManifest(engineRoot);
    expect(creatorManifest.version).toBe(engineManifest.version);
    expect((creatorManifest.dependencies as Record<string, unknown>)["@dylanebert/shallot"]).toBe(
        engineManifest.version,
    );

    const packDir = mkdtempSync(join(tmpdir(), "create-shallot-pack-"));
    const consumerDir = mkdtempSync(join(tmpdir(), "create-shallot-consumer-"));
    const cacheDir = mkdtempSync(join(tmpdir(), "create-shallot-cache-"));
    try {
        const engineArtifact = packedArtifact(engineRoot, packDir);
        const creatorArtifact = packedArtifact(root, packDir);
        const archive = runChecked(["tar", "-tzf", creatorArtifact], root).stdout.split("\n");
        for (const entry of ["package/package.json", "package/src/index.ts", "package/README.md"])
            expect(archive).toContain(entry);
        expect(archive.filter((entry) => entry.startsWith("package/src/"))).toEqual([
            "package/src/index.ts",
        ]);
        for (const directory of ["package/examples/", "package/templates/", "package/tests/"])
            expect(archive.some((entry) => entry.startsWith(directory))).toBe(false);

        writeFileSync(
            resolve(consumerDir, "package.json"),
            `${JSON.stringify(
                {
                    name: "create-shallot-packed-check",
                    private: true,
                    packageManager: "bun@1.4.3",
                    overrides: { "@dylanebert/shallot": `file:${engineArtifact}` },
                    dependencies: {
                        "@dylanebert/shallot": `file:${engineArtifact}`,
                        "create-shallot": `file:${creatorArtifact}`,
                    },
                },
                null,
                2,
            )}\n`,
        );
        runChecked([process.execPath, "install", "--cache-dir", cacheDir], consumerDir);

        const installedCreator = packageManifest(
            resolve(consumerDir, "node_modules/create-shallot"),
        );
        const installedEngineRoot = realpathSync(
            resolve(consumerDir, "node_modules/@dylanebert/shallot"),
        );
        const installedEngine = packageManifest(installedEngineRoot);
        expect(installedCreator.version).toBe(installedEngine.version);
        expect(installedEngine.version).toBe(engineManifest.version);

        const creatorBin = resolve(consumerDir, "node_modules/.bin/create-shallot");
        const engineBin = (installedEngine.bin as Record<string, string> | undefined)?.shallot;
        if (engineBin === undefined) throw new Error("packed engine omitted its shallot bin");
        const engineCli = resolve(installedEngineRoot, engineBin);
        expect(existsSync(creatorBin)).toBe(true);
        expect(existsSync(engineCli)).toBe(true);

        for (const [caseName, args] of [
            ["default", ["project"]],
            ["first-person", ["project", "--template", "first-person"]],
        ] as const) {
            const shimRoot = resolve(consumerDir, `${caseName}-shim`);
            const engineRunRoot = resolve(consumerDir, `${caseName}-engine`);
            mkdirSync(shimRoot);
            mkdirSync(engineRunRoot);

            runChecked([process.execPath, creatorBin, ...args], shimRoot);
            runChecked([process.execPath, engineCli, "create", ...args], engineRunRoot);
            expectSameTree(resolve(shimRoot, "project"), resolve(engineRunRoot, "project"));
        }

        const invalidArgs = ["project", "--template", "not-installed"];
        const shimFailure = run([process.execPath, creatorBin, ...invalidArgs], consumerDir);
        const engineFailure = run(
            [process.execPath, engineCli, "create", ...invalidArgs],
            consumerDir,
        );
        expect(shimFailure.code).toBe(engineFailure.code);
        expect(shimFailure.code).not.toBe(0);
        expect(shimFailure.stdout).toBe(engineFailure.stdout);
        expect(shimFailure.stderr).toBe(engineFailure.stderr);
    } finally {
        rmSync(packDir, { recursive: true, force: true });
        rmSync(consumerDir, { recursive: true, force: true });
        rmSync(cacheDir, { recursive: true, force: true });
    }
}, 120_000);
