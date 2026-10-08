import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { env } from "@/lib/env";
import { PrismaClient } from "@/lib/generated/prisma/client";

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Reuse one client across hot reloads in development so we don't open a new
// connection pool on every module re-evaluation.
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
