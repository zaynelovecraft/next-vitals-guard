# next-vitals-guard ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Article](https://img.shields.io/badge/Deep_Dive-Read_Post-10b981)](https://www.zaynelovecraft.com/articles/generative-engine-optimization-geo-audit-nextjs-cwv)

A zero-dependency budget check for Next.js builds. It reads every JavaScript chunk in `.next/static/chunks`, measures its real gzipped size, and exits with an error when a chunk or the total goes over your budget. Use it in CI to catch a stray `"use client"` import before it slows down your site.

> 📖 **Engineering write-up:** [Generative Engine Optimization (GEO) & CWV Gates in Next.js](https://www.zaynelovecraft.com/articles/generative-engine-optimization-geo-audit-nextjs-cwv)

## Requirements

- Node.js 18 or newer
- A Next.js project that has been built (`next build`). Works with both webpack and Turbopack builds.

## Quick start

Run it from your Next.js project root, after building:

```bash
npm run build
npx -y github:zaynelovecraft/next-vitals-guard
```

Real output from [zaynelovecraft.com](https://www.zaynelovecraft.com) (Next.js 16, Turbopack):

```text
Next.js Client Bundle Budget (.next/static/chunks)

CHUNK                                         RAW       GZIP
--------------------------------------------------------------
1q4itoff--b7w.js                         223.5 kB    69.9 kB
1bf99sczvmond.js                         160.5 kB    43.6 kB
0cz1d0mv5g_q7.js                           110 kB    38.7 kB
0wnicztxtuhf5.js                          25.3 kB     9.3 kB
09dqlr4_tv3sz.js                          28.3 kB     7.5 kB
...
--------------------------------------------------------------
Total Client JS (gzip): 184.4 kB (budget: 220 kB)

✓ All client chunks within Core Web Vitals budget.
```

It shows the 10 largest chunks. It exits with `0` when everything is within budget and `1` when anything is over, so CI fails automatically.

## Options

| Option | Default | What it does |
|--------|---------|--------------|
| `[dir]` (first argument) | `.next` | Path to the build folder |
| `--max-kb=<n>` | `220` | Budget for all client JS combined (gzipped kB) |
| `--max-chunk-kb=<n>` | `95` | Budget for any single chunk (gzipped kB) |
| `NEXT_MAX_GZIP_KB` env var | | Alternative way to set `--max-kb` |

**Picking a budget:** run it once with no flags to see your current numbers, then set the budget a little above them. That way any meaningful increase fails the build.

## Use it in GitHub Actions

```yaml
# .github/workflows/bundle-budget.yml
name: Bundle budget
on: [pull_request]
jobs:
  budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npx -y github:zaynelovecraft/next-vitals-guard --max-kb=220 --max-chunk-kb=90
```

Using pnpm? Add `pnpm/action-setup@v4` before `setup-node` and swap in `pnpm install --frozen-lockfile` and `pnpm build`.

## What it does and doesn't measure

It measures the JavaScript you ship to the browser, which is one of the biggest drivers of slow interactions (INP) and slow loading (LCP). It does **not** run Lighthouse or measure real user timings. Pair it with Lighthouse or your analytics for the full picture.

## License

MIT
