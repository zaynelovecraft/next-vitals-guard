# next-vitals-guard ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Article](https://img.shields.io/badge/Deep_Dive-Read_Post-10b981)](https://www.zaynelovecraft.com/articles/generative-engine-optimization-geo-audit-nextjs-cwv)

Zero-dependency Next.js client bundle & Core Web Vitals CI gate. Scans `.next/static/chunks`, measures real gzipped transfer size for every client chunk, and fails CI when a stray `"use client"` import blows your INP / LCP budget.

> 📖 **Read the full engineering breakdown:** [Generative Engine Optimization (GEO) & CWV Gates in Next.js](https://www.zaynelovecraft.com/articles/generative-engine-optimization-geo-audit-nextjs-cwv)

```text
$ npx github:zaynelovecraft/next-vitals-guard --max-kb=220 --max-chunk-kb=85

Next.js Client Bundle Budget (.next/static/chunks)

CHUNK                                         RAW       GZIP
--------------------------------------------------------------
4bd1b696-cf72ae8a39fa05aa.js              192.4 kB    61.2 kB
main-app-90218a12b.js                     114.8 kB    36.9 kB
app/articles/[slug]/page-81a92.js          42.1 kB    13.4 kB
--------------------------------------------------------------
Total Client JS (gzip): 148.6 kB (budget: 220 kB)

✓ All client chunks within Core Web Vitals budget.
```

## Why Lighthouse Scores Drop Overnight

90% of sudden Next.js App Router performance regressions happen when someone adds `"use client"` to a leaf component that transitively imports a 90 kB icon pack, date library, or syntax highlighter into the shared layout chunk. `next-vitals-guard` catches it in 200ms right after `next build`.

## Usage in GitHub Actions

```yaml
- run: pnpm build
- run: npx github:zaynelovecraft/next-vitals-guard --max-kb=220 --max-chunk-kb=90
```

## License

MIT
