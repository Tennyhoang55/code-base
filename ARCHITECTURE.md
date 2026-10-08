# Architecture

Sunway Quiz is one Next.js 16 App Router application backed by Neon Postgres. The feature requirements are in `docs/FEATURES.md`.

## Stack and layout

- Next.js 16 / React 19 / strict TypeScript, Cache Components and Partial Prefetching.
- Tailwind CSS v4, shadcn Base UI, Biome, pnpm 10.34.6.
- Prisma ORM 7 with PrismaNeon adapter; ExcelJS and csv-parse for imports and exports.

```
app/                        Thin Server Component routes, layouts, loading and errors
app/(training)/             Authenticated employee and admin screens
app/(training)/quan-tri/     Admin routes; xuat/route.ts handles authenticated downloads
features/auth/              Public participant intake, admin login, database sessions
features/quiz/              Validated schemas, scoring, attempt transactions, player
features/training/queries.ts Protected home, ranking, history, quiz and result reads
features/admin/             CRUD, import previews, statistics, audit and Excel reports
components/shared/          Header, filters and loading UI
components/ui/              Base UI primitives
lib/db.ts                   Server-only Prisma singleton
lib/env.ts                  Zod-validated server environment
lib/password.ts             Server-only salted scrypt password hashing
lib/transaction.ts          Serializable transactions with bounded conflict retries
lib/generated/prisma/       Generated Prisma client, gitignored
prisma/schema.prisma        Models and indexes
prisma/migrations/          Reviewed database migration history
prisma/seed.ts               Idempotent initial bank and administrator setup
prisma/seed-data/            Original 17-topic / 222-question bank
scripts/verify.mjs           Isolated Neon branch verification runner
```

## Database and sessions

Runtime uses pooled `DATABASE_URL`; Prisma CLI uses unpooled `DIRECT_URL` from `prisma.config.ts`. Generate the client with `pnpm db:generate`. Apply reviewed migrations with `pnpm db:deploy` during deployment, never on app startup. Do not use destructive reset or data-loss commands without explicit approval.

Branch contains staff. User distinguishes ACCOUNT from PARTICIPANT. Public intake validates name, date of birth, department (Sales, CS, OPS, Thực tập sinh) and branch, then creates a new PARTICIPANT with a server-generated unique code, EMPLOYEE role, null password and no mandatory password change. There is no separate group field. Database check constraints enforce these invariants and require administrators to be password-bearing ACCOUNT identities. Identical declarations never recover or merge another profile; self-declared details are not verified identity credentials.

Session stores only the SHA-256 hash of a random 256-bit token. The cookie is HttpOnly, SameSite=Lax and Secure in production, with a maximum lifetime of 30 days. Participants use this browser-bound session to resume attempts and view their own history; a new browser, cleared cookies, expiry or explicit change of participant starts a new profile while administrators retain old results. Admin password login enforces eight hours of inactivity; the client sends a throttled activity action while the user interacts. Password changes and administrator resets revoke previous account sessions. Five consecutive bad admin logins temporarily lock a code for fifteen minutes. Disabled accounts cannot use existing sessions. Public intake cannot choose roles or recover sessions by name or date of birth.

`currentUser()` is React-cached only for deduplication within the current request. `requireUser()` enforces authentication and mandatory password changes; `requireAdmin()` checks the database role. Every query and action checks these permissions independently. Ownership checks use the session user ID. Layout checks are additional presentation gates and never the sole authorization check.

## Data flow and rendering

Server Components call server-only feature queries directly. UI mutations use Server Actions: authenticate and authorize, parse untrusted inputs with Zod, run database transactions, and revalidate the affected layout. Do not fetch internal Route Handlers from Server Components, load server-readable data with useEffect, or trust client-supplied roles / user IDs / scores.

Pages and layouts remain Server Components; forms, navigation, timers, question selection and result filtering are small client leaves. Authenticated reads stream behind Suspense / route loading boundaries. Each destination segment has its own loading boundary for navigation between routes sharing a layout. No user-specific data enters a shared `use cache` scope.

The quiz client receives visible question text, shuffled options, current choices and timestamps. It receives neither correct indexes nor explanations until a submitted result permits review. Admin query results and password hashes never go to employee components. Downloads authenticate as admin and send private, no-store responses.

## Attempts and scoring

Topic and Question form the editable bank. Starting a quiz snapshots question text, options, shuffled correct index and explanation into AttemptQuestion, ordered by position. Editing or hiding a question cannot mutate existing snapshots or historical scores.

Attempt has one unique nullable `activeKey` per user. Start, save, expiry, submission and cancellation coordinate through serializable transactions and a per-user revision update. The engine checks ownership and server timestamps, rejects late answer changes, calculates score on the server, and releases the active key when finished. Repeated submission is idempotent.

Answers are saved durably to Postgres and temporarily to localStorage under the attempt ID. Saves run in order; reconnect and reload merge the device's choices and resynchronize. A deadline caps duration and triggers submission using choices already saved before the deadline. Untimed attempts older than twenty-four hours are cancelled when checked; no background scheduler is required for correctness.

Pass threshold is read on submission and recorded in Attempt. Result/history show the original score, bank snapshot and threshold. Rankings and progress normalize topic contributions against currently enabled questions; hidden or moved questions no longer contribute to that topic's current maximum. Mixed quizzes are ranked separately and never added to overall totals. Best attempts sort by percentage, duration, submission date and deterministic ID. Overall ties use total points, completed topics and total duration.

## Administration and audit

Staff CSV/XLSX imports are limited, previewed and revalidated on confirmation. Codes and branches are checked against current data; staff creation and its audit record are atomic. Temporary passwords appear only in the action result, never in audit logs or normal queries. Question JSON imports validate IDs, four distinct choices and correct indexes, then use parameterized bulk upsert inside the transaction. Existing enabled states and historical snapshots survive reimport.

Excel reports reuse the same protected query filters as the screens and include declared birth date and department. These fields stay in the participant's own profile and admin-only queries, never public rankings. Workbook headers, dates and file names use Vietnamese labels and Vietnam time. AuditLog records participant intake (without birth date), logins, password changes/resets, staff changes, question/topic changes, settings and imports. Legacy employee import is retained for old rosters; its records do not merge with participants and cannot use admin password login.

## Security and operations

- `server-only` protects database, password, session and private query modules.
- Zod validates environment, forms, uploaded data, identifiers, filters and answer maps.
- No secrets use a `NEXT_PUBLIC_` variable. `.env*`, `.neon`, `.local`, generated clients and test output are ignored.
- UI errors omit SQL, stack traces and database details; the error boundary exposes only a diagnostic digest.
- Initial admin credentials are written to a local ignored file. Remove it after receiving and changing the password.
- Tests use a separate Neon branch. The runner verifies a different database hostname before allowing mutations.

Run `pnpm lint`, `pnpm typecheck`, `pnpm build` and the appropriate isolated integration/browser checks before finishing changes. See README for setup and test commands.
