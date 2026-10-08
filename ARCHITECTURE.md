# Architecture

Next.js 16 (App Router) fullstack app. One deployable, no separate API server.

## Stack

| Concern    | Choice                                                         |
| ---------- | -------------------------------------------------------------- |
| Framework  | Next.js 16, React 19, TypeScript (strict)                      |
| Rendering  | Server Components + Cache Components (`cacheComponents: true`) |
| Styling    | Tailwind CSS v4 (`@tailwindcss/postcss`), shadcn/ui (Base UI)  |
| Database   | Neon Postgres, Prisma ORM 7 + `@prisma/adapter-neon`           |
| Validation | Zod 4 (env, FormData, request payloads)                        |
| Tooling    | Biome (lint + format), pnpm                                    |

## Layout

```
app/                 Routes only: layout, page, error, loading, route.ts
components/ui/       shadcn/ui primitives (generated, lightly edited)
components/shared/   App-wide UI (header, sidebar, ...)
features/<name>/     Business features, created when one exists
  components/        Feature UI (server by default, client leaves only)
  queries.ts         Server-only reads
  actions.ts         Server Actions (mutations)
  schemas.ts         Zod schemas + inferred types
lib/db.ts            Prisma Client singleton (server-only)
lib/env.ts           Zod-validated server env (server-only)
lib/utils.ts         cn() = clsx + tailwind-merge
lib/generated/       Prisma Client output (gitignored, `pnpm db:generate`)
prisma/schema.prisma Models; migrations/ appears after the first migration
prisma.config.ts     Prisma CLI config (schema path, migrations, DIRECT_URL)
```

Routes stay thin: a `page.tsx` composes feature components and passes params.
Add `features/` folders, `loading.tsx`, Route Handlers etc. only when needed.

## Database

- **Runtime**: `lib/db.ts` creates `PrismaClient` with `PrismaNeon` using the
  **pooled** `DATABASE_URL` (Neon host with `-pooler`). The client is cached on
  `globalThis` outside production so dev hot reloads reuse one pool.
- **CLI** (`migrate`, `studio`): `prisma.config.ts` uses the **direct**
  `DIRECT_URL`. `dotenv` loads `.env` for the CLI; Next.js loads it for the app.
- Prisma Client is generated into `lib/generated/prisma`; import types from
  `@/lib/generated/prisma/client` instead of redefining models.
- Migrations: `pnpm db:migrate` in development, `pnpm db:deploy` in CI/deploy
  step. Never on app start; never `migrate reset` / `--accept-data-loss`
  without explicit approval.
- Use `db.$transaction([...])` or the interactive form when several writes
  must succeed or fail together.

## Data flow

### Reads

Server Components call `features/<name>/queries.ts` directly; no HTTP round
trip to our own Route Handlers.

```ts
// features/posts/queries.ts
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

// Public, shared data: cache it and tag it for invalidation.
export async function getPublishedPosts() {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  return db.post.findMany({
    where: { published: true },
    select: { id: true, title: true, createdAt: true }, // only what the UI needs
    orderBy: { createdAt: "desc" },
  });
}
```

Choosing a rendering strategy (Cache Components model):

- **Static**: no runtime data → prerendered automatically (current `/`).
- **Cached shared data**: `"use cache"` + `cacheLife` + `cacheTag`.
- **Per-request or per-user data** (reads `cookies()`, `headers()`, session):
  do **not** put it in a shared `"use cache"`. Render it uncached inside
  `<Suspense>`, or use `"use cache: private"`. User-specific data must never
  land in a shared cache entry.

### Mutations

Forms call Server Actions. Every action: validate with Zod → authenticate →
authorize on the resource → write → invalidate cache → return a typed state.

```ts
// features/posts/schemas.ts
import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề").max(200),
});

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"title", string[]>>;
};
```

```ts
// features/posts/actions.ts
"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { createPostSchema, type FormState } from "./schemas";

export async function createPost(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = createPostSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  // const session = await requireSession(); // real auth required for protected data
  // ownership / role checks go here, using the session, never client input

  try {
    await db.post.create({ data: { title: parsed.data.title } });
  } catch {
    return { status: "error", message: "Không thể lưu. Vui lòng thử lại." };
  }

  updateTag("posts"); // read-your-own-writes; revalidateTag(tag, "max") for SWR
  return { status: "success" };
}
```

Client side: a small `"use client"` form using `useActionState`; disable the
submit button while `pending` to prevent double submits, show `fieldErrors`
next to inputs with `aria-invalid` / `aria-describedby`.

Cache invalidation after mutations:

- `updateTag(tag)` — Server Actions; the user sees their change immediately.
- `revalidateTag(tag, "max")` — Server Actions or Route Handlers;
  stale-while-revalidate (e.g. webhooks).
- `revalidatePath(path)` — when a route has no suitable tag.

### Route Handlers

`app/**/route.ts` only for independent HTTP endpoints: webhooks, OAuth
callbacks, APIs for external clients, file downloads. Validate the body with
Zod (`await request.json()` is `unknown`), verify signatures/auth, return
minimal JSON.

## Security

- `server-only` in `lib/db.ts`, `lib/env.ts` and every `queries.ts`. Server
  Actions are public endpoints: treat their arguments as untrusted.
- Never trust `userId`, role, ownership or price from the client; derive them
  from the server session and the database.
- **Authentication is not set up yet.** Do not build protected write features
  until a real auth solution exists; never add fake or default-allow checks.
- Errors shown to users are generic; `app/error.tsx` shows only `digest`.
  Never render stack traces, SQL or Prisma error messages.
- Env vars: declared in `lib/env.ts` (validated on first server import) and
  documented in `.env.example`. Nothing secret uses the `NEXT_PUBLIC_` prefix.

## UI

- Tailwind v4 config lives in CSS: tokens and dark theme (`.dark`) in
  `app/globals.css`, `@theme inline` maps them to utilities.
- Use shadcn primitives from `components/ui` (button, input, label, dialog,
  card); add more via `pnpm shadcn add <name>` (shadcn is a local dependency).
- Semantic HTML, a label for every input, visible `focus-visible` rings,
  keyboard-operable controls. Handle loading (Suspense / `loading.tsx`),
  empty, error and pending states where data or forms exist.
