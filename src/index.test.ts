import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifest = JSON.parse(readFileSync(resolve(import.meta.dir, "../package.json"), "utf8"));

test("shim release is pinned to the matching Shallot engine", () => {
    expect(manifest.dependencies["@dylanebert/shallot"]).toBe(manifest.version);
});
