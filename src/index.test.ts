import { expect } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check } from "@dylanebert/shallot/harness/check";
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

check(
    "scaffold creates all nested project parents",
    {
        claim: "scaffold creates every declared project file and nested parent directory",
    },
    () => {
        const root = temporaryRoot("shallot-scaffold-");
        try {
            scaffold(root, template("demo"));

            for (const rel of [
                "package.json",
                "shallot.json",
                "public/icon.svg",
                "public/scenes/scene.scene",
            ]) {
                expect(existsSync(join(root, rel))).toBe(true);
            }
            expect(JSON.parse(readFileSync(join(root, "package.json"), "utf-8")).name).toBe("demo");
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    },
);

check(
    "main refuses a missing project name",
    {
        claim: "main refuses missing project names with usage output and a nonzero return code",
    },
    () => {
        const output = captureOutput(() => main([]));
        expect(output.value).toBe(1);
        expect(output.stderr).toContain("Usage: bun create shallot <project-name>");
    },
);

check(
    "main refuses an existing directory",
    {
        claim: "main refuses an existing target directory without overwriting it",
    },
    () => {
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
    },
);

check(
    "main scaffolds a fresh project",
    {
        claim: "main reports successful creation and returns zero for a fresh project",
    },
    () => {
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
    },
);
