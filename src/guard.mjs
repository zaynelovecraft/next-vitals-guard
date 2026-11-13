import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function walkJsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkJsFiles(full));
    else if (entry.name.endsWith(".js")) results.push(full);
  }
  return results;
}

export function analyzeBuildDir(buildDir, { maxTotalKb = 220, maxChunkKb = 95 } = {}) {
  const chunksDir = path.join(buildDir, "static", "chunks");
  if (!fs.existsSync(chunksDir)) {
    throw new Error(`No Next.js chunks found at ${chunksDir}. Run "next build" first.`);
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
  const passed = totalGzipKb <= maxTotalKb && offenders.length === 0;

  return {
    chunksDir,
    chunkCount: files.length,
    totalGzipKb,
    maxTotalKb,
    maxChunkKb,
    offenders,
    files,
    passed,
  };
}
