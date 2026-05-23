# Repomix Presets for SuperAdPro

Repomix packs the codebase into a single LLM-ready file. Run a preset, get one XML
file you can paste into Claude (or commit and have Claude `view` it) to load the
relevant slice of the codebase in one shot — instead of Claude hunting through
40+ backend files and 96 React pages one at a time.

## How to use

```bash
npm run pack:commissions   # any preset name
```

Output lands in `repomix-<preset>.xml` at the repo root (gitignored).

## Preset cheat sheet

| Preset            | Files | Tokens | When to use                                              |
| ----------------- | ----- | ------ | -------------------------------------------------------- |
| `pack:map`        | 44    | ~265K  | Compressed backend signatures only. "Where does X live?" |
| `pack:commissions`| 11    | ~66K   | Anything touching commission math, splits, payouts       |
| `pack:payments`   | 10    | ~48K   | WalletConnect/BSC, withdrawals, crypto flows             |
| `pack:creative`   | 10    | ~17K   | Creative Studio, BPG, fal.ai, Grok Imagine, EvoLink      |
| `pack:funnels`    | 21    | ~161K  | SuperPages editor, LinkHub, funnels, custom domains      |
| `pack:leads`      | 7     | ~48K   | Lead Finder (Outscraper), MyLeads, Brevo autoresponder   |
| `pack:admin`      | 55    | ~135K  | Admin dashboard, health scanners, MCP monitoring         |

## Custom one-off bundles

```bash
npx repomix --include "app/grid.py,docs/commission-spec.md,frontend/src/pages/Grid*"
```

## Known architectural debt

`app/main.py` is **38,538 lines** (414K tokens) — most FastAPI routes live in this
one file. This is the single largest factor making the full backend bundle too
big to load. Worth scheduling a refactor pass to split into route modules
(`app/routes/commissions.py`, `app/routes/payments.py`, etc).

## Config files

- `repomix.config.json` — default config (used when running bare `npm run pack`)
- `.repomix/*.json` — preset configs, one per feature area

## Updating presets

When new feature areas appear, add a config to `.repomix/` and a script to
`package.json`. Keep each preset under ~150K tokens where possible — that's the
sweet spot for loading into Claude's context alongside a real conversation.
