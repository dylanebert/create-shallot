#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const engineEntry = fileURLToPath(import.meta.resolve("@dylanebert/shallot"));
const engineRoot = resolve(dirname(engineEntry), "..");
const enginePackage = JSON.parse(readFileSync(resolve(engineRoot, "package.json"), "utf8")) as {
    bin: { shallot: string };
};
const engineCli = resolve(engineRoot, enginePackage.bin.shallot);
const result = spawnSync(process.execPath, [engineCli, "create", ...process.argv.slice(2)], {
    stdio: "inherit",
});

if (result.error) {
    console.error(result.error);
    process.exit(1);
}
if (result.signal) process.kill(process.pid, result.signal);
else process.exit(result.status ?? 1);
