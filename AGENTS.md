<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

Read `ARCHITECTURE.md` before changing structure, data flow or the database layer.

## Commands

- `pnpm dev` — dev server (Turbopack)
- `pnpm lint` / `pnpm lint:fix` — Biome lint + format check (no ESLint/Prettier)
- `pnpm typecheck` — `next typegen` + `tsc --noEmit`
- `pnpm build` — production build
- `pnpm db:generate` — regenerate Prisma Client (also runs on `postinstall`)
- `pnpm db:migrate` — create/apply a migration in development (`prisma migrate dev`)
- `pnpm db:deploy` — apply migrations in CI/production (`prisma migrate deploy`)

Run `pnpm lint && pnpm typecheck && pnpm build` before finishing a task.

## Versions (check `package.json` before relying on memory)

- Next.js 16 with `cacheComponents` + `partialPrefetching`. Read `node_modules/next/dist/docs/` first.
- Tailwind CSS v4 via `@tailwindcss/postcss`; no `tailwind.config.ts`. Tokens live in `app/globals.css`.
- Prisma ORM 7 (`prisma-client` generator, output `lib/generated/prisma`, gitignored). Prisma 8 is RC — do not upgrade.
- shadcn/ui `base-nova` style (Base UI primitives, use the `render` prop instead of `asChild`).
- Zod 4, Biome 2. Package manager: pnpm only.

## Hard rules

- Server Components by default. Never put `"use client"` in `page.tsx` or `layout.tsx`; push client boundaries down to the smallest interactive leaf.
- Read data in Server Components via server modules (`features/*/queries.ts`); never `fetch` your own route handlers. No `useEffect` data loading for data the server can read.
- Mutations from UI go through Server Actions (`features/*/actions.ts`). Route Handlers only for webhooks, OAuth callbacks, external APIs, file downloads.
- Validate every FormData / request payload / env var with Zod. Use `unknown` for unverified input. No explicit `any`, no `as` casts to silence errors.
- `import "server-only"` in any module touching the database, secrets or private data. Only import `@/lib/db` from server-only modules.
- Never trust `userId`, role, ownership or prices from the client. Protected data requires real authentication + authorization checks on the server; there is no auth yet, so do not build protected write features until it exists. Never add fake/default-allow auth.
- Return only the fields the client needs (Prisma `select`), never full records or secrets.
- Never run `prisma migrate reset`, `db push --accept-data-loss` or other destructive commands without explicit user approval. Never run migrations on app startup.
- Never commit `.env`. Add new env vars to both `lib/env.ts` and `.env.example`.
- shadcn: the CLI now emits `import { cn } from "cn"`. After `shadcn add`, change it to `import { cn } from "@/lib/utils"` and run `pnpm lint:fix`.
- Don't create empty folders, repository/service layers or abstractions without a concrete need.
