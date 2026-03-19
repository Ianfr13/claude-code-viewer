# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Rules (Read First)

**Language**:
- Code, comments, and commit messages should be in English

**NEVER**:
- Use `as` type casting in ANY context including test code (explain the problem to the user instead)
- Use raw `fetch` or bypass TanStack Query for API calls
- Run `pnpm dev` or `pnpm start` (dev servers)
- Use `node:fs`, `node:path`, etc. directly (use Effect-TS equivalents)

**ALWAYS**:
- Use Effect-TS for all backend side effects
- Use Hono RPC + TanStack Query for all API calls
- Follow TDD: write tests first, then implement
- Run `pnpm typecheck` and `pnpm fix` before committing

## Commands

```bash
# Install dependencies
pnpm install

# Build (compiles i18n, builds frontend with Vite, bundles backend with esbuild → dist/)
pnpm build

# Type checking
pnpm typecheck

# Auto-fix linting and formatting (Biome)
pnpm fix

# Check only — lint + format (run in CI)
pnpm lint

# Run unit tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run only tests affected since origin/main
pnpm vitest run --changed origin/main

# E2E visual regression snapshot capture (Playwright-based VRT)
pnpm e2e

# i18n: extract new/updated strings into catalog files
pnpm lingui:extract

# i18n: compile catalogs to TypeScript
pnpm lingui:compile

# Check for missing translations (used in CI)
./scripts/lingui-check.sh
```

## Default Verification Before Committing

Run all of the following without being asked; fix any failures proactively:

```bash
pnpm typecheck
pnpm fix
pnpm vitest run --changed origin/main
./scripts/lingui-check.sh
```

## Commit Message Rules

Conventional Commits format: `type: description`

Commit messages are included in release notes — write for users.

| Type | Release Note | Purpose |
|------|--------------|---------|
| `feat` | Features | User-facing new feature |
| `fix` | Bug Fixes | User-impacting bug fix |
| `chore`, `ci`, `build`, `refactor` | Excluded | Internal changes |

**Critical**: Use `fix` only for user-facing bugs. Internal fixes (linter errors, type errors, build scripts) must use `chore`.

Examples:
- Bad: `fix: fix lingui error` (internal issue)
- Bad: `feat: add button` (too vague)
- Good: `feat: add dark mode toggle to settings`
- Good: `fix: session list not updating after deletion`
- Good: `chore: update lingui compiled messages`

## Project Overview

Claude Code Viewer reads Claude Code session logs directly from JSONL files (`~/.claude/projects/`) with zero data loss. It's a web-based client distributed as a CLI tool (`claude-code-viewer`) that serves a Vite-built frontend.

**Core Architecture**:
- Frontend: Vite + TanStack Router + React 19 + TanStack Query + Jotai (global state)
- Backend: Hono (standalone server, `@hono/node-server`) + Effect-TS (all business logic)
- Data: Direct JSONL reads with strict Zod validation; no separate database
- Real-time: Server-Sent Events (SSE) at `/api/sse` for live session updates
- Cache: `~/.claude-code-viewer/` (invalidated via SSE when source changes)

In dev mode, Vite proxies `/api` to the backend (port 3401). In production, a single `dist/main.js` serves both static files and API on one port.

## Key Directory Patterns

- `src/server/hono/route.ts` — All Hono API route definitions
- `src/server/core/` — Effect-TS domain modules (claude-code, session, project, git, events, scheduler, rate-limit, platform, etc.)
- `src/lib/conversation-schema/` — Zod schemas for JSONL conversation log validation
- `src/lib/api/` — Hono RPC client (frontend)
- `src/lib/sse/` — SSE connection management (frontend)
- `src/testing/layers/` — Reusable Effect test layers (`testPlatformLayer` is the foundation)
- `src/routes/` — TanStack Router file-based routes
- `src/app/` — Shared page components and hooks
- `src/components/ui/` — shadcn/ui components
- `mock-global-claude-dir/` — Mock JSONL data for E2E tests (useful schema reference)

## Coding Standards

### Backend: Effect-TS

**Prioritize Pure Functions**:
- Extract logic into pure, testable functions whenever possible
- Only use Effect-TS when side effects or state management is required

**Use Effect-TS for Side Effects and State**:
- Mandatory for I/O operations, async code, and stateful logic
- Avoid class-based implementations or mutable variables for state
- Reference: https://effect.website/llms.txt

Each domain module in `src/server/core/` follows this structure:
- `functions/` — Pure functions
- `services/` — Effect-TS services for I/O or state
- `presentation/` — Controllers wiring services to Hono routes
- `infrastructure/` — Repositories for data access

**Testing with Layers**:
```typescript
import { expect, test } from "vitest"
import { Effect } from "effect"
import { testPlatformLayer } from "@/testing/layers"
import { yourEffect } from "./your-module"

test("example", async () => {
  const result = await Effect.runPromise(
    yourEffect.pipe(Effect.provide(testPlatformLayer))
  )
  expect(result).toBe(expectedValue)
})
```

**Avoid Node.js Built-ins** (use Effect platform equivalents for testability):
- `FileSystem.FileSystem` instead of `node:fs`
- `Path.Path` instead of `node:path`
- `Command.string` instead of `child_process`

**Type Safety — NO `as` Casting**:
- `as` casting is strictly prohibited
- If types seem unsolvable without `as`, explain the problem and ask for guidance
- Valid alternatives: type guards, assertion functions, Zod schema validation

### Frontend: API Access

**Hono RPC + TanStack Query Only**:
```typescript
import { api } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"

const { data } = useQuery({
  queryKey: ["example"],
  queryFn: () => api.endpoint.$get().then(res => res.json())
})
```

Raw `fetch` and direct requests are prohibited. For real-time updates use the `useServerEventListener` hook.

### Tech Standards

- **Linter/Formatter**: Biome (not ESLint/Prettier) — `noProcessEnv` rule is set to error level
- **Type Config**: `@tsconfig/strictest`
- **Path Alias**: `@/*` maps to `./src/*`

## Architecture Details

### SSE (Server-Sent Events)

- Use SSE for delivering session log updates and background process state changes to the frontend
- Never use SSE for request-response patterns (use Hono RPC instead)
- Server: `/api/sse` endpoint with type-safe events (`TypeSafeSSE`)
- Client: `useServerEventListener` hook for subscriptions
- Event types: `connect`, `heartbeat`, `sessionListChanged`, `sessionChanged`, `sessionProcessChanged`, `permissionRequested`

### Data Layer

- **Single Source of Truth**: `~/.claude/projects/*.jsonl`
- **Cache**: `~/.claude-code-viewer/` (invalidated via SSE when source changes)
- **Validation**: Strict Zod schemas ensure every field is captured

### Session Process Management

Claude Code processes remain alive in the background (unless aborted), allowing session continuation without changing session-id. Memory sharing between processes makes production build verification crucial.

## i18n

Translation catalogs live in `src/lib/i18n/locales/`. Supported languages: English, Japanese, Simplified Chinese. When adding user-visible strings: run `pnpm lingui:extract`, add translations, run `pnpm lingui:compile`. Missing translations fail CI.

## E2E Snapshots

VRT uses Playwright to capture screenshots for visual regression. **Do not commit locally captured snapshots** — they vary by environment. For PRs with UI changes, add the `vrt` label to trigger automatic snapshot updates in CI.

---
# System CLIs Available

The following CLI tools are pre-installed. Full docs are in `.claude/cli-docs/` and available as slash commands.

Installed: ai-context cli-anything-infisical cli-anything-railway cloudflared gh gws playwright supabase wrangler
