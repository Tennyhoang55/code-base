import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI config (migrate, studio, db pull). The CLI needs a direct,
// non-pooled Neon connection; the app runtime uses the pooled DATABASE_URL.
// process.env (not env()) keeps `prisma generate` working without a database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
