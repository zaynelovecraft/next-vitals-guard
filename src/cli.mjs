#!/usr/bin/env node
/**
 * next-vitals-guard — Inspects .next/ build manifests and static chunks
 * to enforce client JS budgets before a PR tanks LCP / INP in production.
 */

import path from "node:path";
import { analyzeBuildDir } from "./guard.mjs";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

const args = process.argv.slice(2);
const jsonFlag = args.includes("--json");
const maxTotalRaw = args.find((a) => a.startsWith("--max-kb="))?.split("=")[1] ?? process.env.NEXT_MAX_GZIP_KB;
const maxChunkRaw = args.find((a) => a.startsWith("--max-chunk-kb="))?.split("=")[1];
const maxTotalKb = maxTotalRaw === undefined ? 220 : Number(maxTotalRaw);
const maxChunkKb = maxChunkRaw === undefined ? 95 : Number(maxChunkRaw);
const buildDir = path.resolve(process.cwd(), args.find((a) => !a.startsWith("-")) ?? ".next");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`${BOLD}next-vitals-guard${RESET} — Next.js client JS & CWV budget gate

${BOLD}Usage:${RESET}
  npx github:zaynelovecraft/next-vitals-guard [.next] [--max-kb=220] [--max-chunk-kb=95] [--json]`);
  process.exit(0);
}

if (!Number.isFinite(maxTotalKb) || maxTotalKb <= 0 || !Number.isFinite(maxChunkKb) || maxChunkKb <= 0) {
  console.error(`${RED}Invalid budget flag. --max-kb and --max-chunk-kb must be positive numbers.${RESET}`);
  process.exit(1);
}

let report;
try {
  report = analyzeBuildDir(buildDir, { maxTotalKb, maxChunkKb });
} catch (err) {
  console.error(`${RED}${err.message}${RESET}`);
  process.exit(1);
}

if (jsonFlag) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}

console.log(`\n${BOLD}Next.js Client Bundle Budget${RESET} ${DIM}(${report.chunksDir})${RESET}\n`);
console.log(`${BOLD}${"CHUNK".padEnd(38)} ${"RAW".padStart(10)} ${"GZIP".padStart(10)}${RESET}`);
console.log(`${DIM}${"-".repeat(62)}${RESET}`);

for (const f of report.files.slice(0, 10)) {
  const color = f.gzipKb > maxChunkKb ? RED : f.gzipKb > maxChunkKb * 0.8 ? YELLOW : GREEN;
  console.log(
    `${CYAN}${f.name.padEnd(38).slice(0, 38)}${RESET} ${(f.rawKb + " kB").padStart(10)} ${color}${(f.gzipKb + " kB").padStart(10)}${RESET}`
  );
}

if (report.chunkCount > 10) {
  console.log(`${DIM}... showing top 10 of ${report.chunkCount} JS chunks${RESET}`);
}

console.log(`${DIM}${"-".repeat(62)}${RESET}`);
console.log(
  `${BOLD}Total Client JS (gzip):${RESET} ${report.totalGzipKb > maxTotalKb ? RED : GREEN}${report.totalGzipKb} kB${RESET} ${DIM}(budget: ${maxTotalKb} kB across ${report.chunkCount} chunks)${RESET}\n`
);

if (!report.passed) {
  console.error(
    `${RED}✗ Budget exceeded:${RESET} ${report.offenders.length} chunk(s) over ${maxChunkKb} kB gzip or total > ${maxTotalKb} kB.`
  );
  process.exit(1);
}

console.log(`${GREEN}✓ All client chunks within Core Web Vitals budget.${RESET}`);
