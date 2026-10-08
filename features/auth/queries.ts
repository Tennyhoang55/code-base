import "server-only";
import { connection } from "next/server";
import { db } from "@/lib/db";

export async function getEntryBranches() {
  await connection();
  return db.branch.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
