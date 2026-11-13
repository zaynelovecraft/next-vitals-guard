import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeBuildDir } from "../src/guard.mjs";

function makeFakeBuild(chunks) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nvg-"));
  const dir = path.join(root, ".next", "static", "chunks");
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(chunks)) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return path.join(root, ".next");
}

describe("analyzeBuildDir", () => {
  it("passes when chunks and total gzipped JS stay under budget", () => {
    const buildDir = makeFakeBuild({
      "app/page.js": "export const ok = true;".repeat(20),
      "main.js": "console.log('ready');".repeat(20),
    });

    const report = analyzeBuildDir(buildDir, { maxTotalKb: 50, maxChunkKb: 25 });
    assert.equal(report.passed, true);
    assert.equal(report.chunkCount, 2);
    assert.equal(report.offenders.length, 0);
  });

  it("fails when a single chunk exceeds maxChunkKb", () => {
    const noisy = crypto.randomBytes(2048).toString("base64");
    const buildDir = makeFakeBuild({
      "heavy.js": noisy,
    });

    const report = analyzeBuildDir(buildDir, { maxTotalKb: 100, maxChunkKb: 1 });
    assert.equal(report.passed, false);
    assert.equal(report.offenders.length, 1);
    assert.equal(report.offenders[0].name, "heavy.js");
  });

  it("throws when .next/static/chunks does not exist", () => {
    assert.throws(() => analyzeBuildDir("/tmp/does-not-exist-next-dir"), /No Next\.js chunks found/);
  });
});
