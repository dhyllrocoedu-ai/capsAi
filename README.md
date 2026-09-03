# Capstone AI

**Your AI-powered Capstone Adviser and Documentation Workspace.**

Capstone AI helps BSIT / CS / IS students plan their capstone system, write
documentation chapter by chapter, find legitimate research sources, and review
alignment before the panel does.

It **assists and guides** - it never silently writes academic work for you.

---

## Status: Phase 1 - Foundation (Local Testing Build)

This build runs entirely in your browser: data lives in `localStorage`, auth
uses local test accounts, and the AI adviser calls NVIDIA NIM directly when a
key is configured, falling back to a deterministic mock provider otherwise.

| Capability | Status |
| --- | --- |
| Auth (register/login/logout) + guarded routes | Done (local accounts) |
| Dashboard with progress + activity feed | Done |
| Project CRUD + workspace layout | Done |
| Documentation editor (TipTap, autosave, word count) | Done |
| Standard 5-chapter structure seeding | Done |
| AI Adviser chat with 6 adviser modes | Done (mock or NVIDIA) |
| Cloudflare Pages Functions API stub | Done (health endpoint) |
| Supabase + RLS | Phase 2 |
| Onboarding wizard (problem, objectives, scope) | Phase 2 |
| Research search (OpenAlex/Crossref) + citations | Phase 5 |
| Document upload + RAG (pgvector) | Phase 6 |
| AI Panel Reviewer + Alignment Engine | Phase 7 |

## Tech Stack

- React 18, TypeScript (strict), Vite, Tailwind CSS
- TanStack Router (typed routes, `beforeLoad` auth guards)
- Zustand stores over a typed repository layer
- TipTap v2 editor
- NVIDIA NIM via an `AIProvider` interface (`src/services/ai/`)
- Cloudflare Pages + Pages Functions as hosting target

## Architecture

```
Browser (React SPA)
  src/features/*          UI by domain
  src/lib/stores/*        Zustand state
  src/lib/repositories/*  DATA ACCESS BOUNDARY - swap to Supabase here
  src/services/ai/*       AIProvider -> NVIDIA NIM | Mock provider
functions/api/[[path]].ts Cloudflare Pages Function (AI proxy in later phases)
```

Components never touch storage directly. Everything goes through repositories,
so migrating from localStorage to Supabase means re-implementing only those
modules.

## Getting Started

Prerequisites: Node.js 20+ and npm. Optional: an NVIDIA API key from
https://build.nvidia.com.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Then:

1. Register a test account (stored locally only).
2. Create a project from the Projects page.
3. Write chapters under Documentation; chat with the Adviser.
4. Settings shows which services are active.

### Scripts

```bash
npm run dev         # Vite dev server
npm run build       # typecheck + production bundle to dist/
npm run preview     # serve dist/ locally
npx tsc --noEmit    # typecheck only
npm run cf:dev      # serve dist/ through wrangler (tests Pages Functions)
npm run cf:deploy   # build + deploy to Cloudflare Pages
```

## Environment Variables

See `.env.example`.

```text
VITE_NVIDIA_API_KEY=      # optional; omit for mock mode
VITE_NVIDIA_CHAT_MODEL=   # default: nvidia/nemotron-3-nano-30b-a3b
VITE_NVIDIA_EMBED_MODEL=  # default: nvidia/nv-embedqa-e5-v5

# Server-only, consumed by functions/api in later phases:
NVIDIA_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENALEX_API_KEY=
CROSSREF_MAILTO=
```

Important: `VITE_*` variables are build-time public. Before production
deployment the NVIDIA call must move server-side into `functions/api` so no key
ever ships to the browser. The provider class is written runtime-agnostic to
make that move a call-site change only.

## Cloudflare Deployment

```bash
npm run cf:deploy
```

Or connect the repository in the Cloudflare Pages dashboard:
build command `npm run build`, output directory `dist`. Functions in
`functions/` deploy automatically.

## Security Notes

- No secrets are committed; `.env*` files are gitignored.
- Local test passwords are salted SHA-256 hashes - adequate only for local
  testing; real auth comes from Supabase Auth.
- The API layer (later phases) will enforce ownership checks server-side and
  keep all provider keys out of client code.

## Roadmap

Phase 2 adds the project onboarding wizard and knowledge profile, which feed
every AI feature. Phases 3-7 add streaming chat, version history, research
search, RAG over uploads, and the alignment-aware panel reviewer.
