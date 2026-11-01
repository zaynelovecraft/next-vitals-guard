#!/usr/bin/env node
/**
 * next-vitals-guard — Inspects .next/ build manifests and static chunks
 * to enforce client JS budgets before a PR tanks LCP / INP in production.
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

const args = process.argv.slice(2);
const maxTotalKb = Number(
  args.find((a) => a.startsWith("--max-kb="))?.split("=")[1] ?? process.env.NEXT_MAX_GZIP_KB ?? 220
);
const maxChunkKb = Number(
  args.find((a) => a.startsWith("--max-chunk-kb="))?.split("=")[1] ?? 95
);
const buildDir = path.resolve(process.cwd(), args.find((a) => !a.startsWith("--")) ?? ".next");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`${BOLD}next-vitals-guard${RESET} — Next.js client JS & CWV budget gate

${BOLD}Usage:${RESET}
  npx next-vitals-guard [.next] [--max-kb=220] [--max-chunk-kb=95]`);
  process.exit(0);
}

const chunksDir = path.join(buildDir, "static", "chunks");
if (!fs.existsSync(chunksDir)) {
  console.error(`${RED}No Next.js chunks found at ${chunksDir}. Run "next build" first.${RESET}`);
  process.exit(1);
}

function walkJsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkJsFiles(full));
    else if (entry.name.endsWith(".js")) results.push(full);
  }
  return results;
}

const files = walkJsFiles(chunksDir).map((file) => {
  const buf = fs.readFileSync(file);
  const gzipBytes = zlib.gzipSync(buf).length;
  return {
    name: path.relative(chunksDir, file),
    rawKb: +(buf.length / 1024).toFixed(1),
    gzipKb: +(gzipBytes / 1024).toFixed(1),
  };
});

files.sort((a, b) => b.gzipKb - a.gzipKb);
const totalGzipKb = +files.reduce((sum, f) => sum + f.gzipKb, 0).toFixed(1);
const offenders = files.filter((f) => f.gzipKb > maxChunkKb);

console.log(`\n${BOLD}Next.js Client Bundle Budget${RESET} ${DIM}(${chunksDir})${RESET}\n`);
console.log(`${BOLD}${"CHUNK".padEnd(38)} ${"RAW".padStart(10)} ${"GZIP".padStart(10)}${RESET}`);
console.log(`${DIM}${"-".repeat(62)}${RESET}`);

for (const f of files.slice(0, 10)) {
  const color = f.gzipKb > maxChunkKb ? RED : f.gzipKb > maxChunkKb * 0.8 ? YELLOW : GREEN;
  console.log(
    `${CYAN}${f.name.padEnd(38).slice(0, 38)}${RESET} ${(f.rawKb + " kB").padStart(10)} ${color}${(f.gzipKb + " kB").padStart(10)}${RESET}`
  );
}

console.log(`${DIM}${"-".repeat(62)}${RESET}`);
console.log(
  `${BOLD}Total Client JS (gzip):${RESET} ${totalGzipKb > maxTotalKb ? RED : GREEN}${totalGzipKb} kB${RESET} ${DIM}(budget: ${maxTotalKb} kB)${RESET}\n`
);

if (totalGzipKb > maxTotalKb || offenders.length > 0) {
  console.error(
    `${RED}✗ Budget exceeded:${RESET} ${offenders.length} chunk(s) over ${maxChunkKb} kB gzip or total > ${maxTotalKb} kB.`
  );
  process.exit(1);
}

console.log(`${GREEN}✓ All client chunks within Core Web Vitals budget.${RESET}`);
