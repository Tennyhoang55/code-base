import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "sunway_session";
export const IDLE_MS = 8 * 60 * 60 * 1000;
const PARTICIPANT_IDLE_MS = 30 * 24 * 60 * 60 * 1000;
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const userSelect = {
  id: true,
  employeeCode: true,
  name: true,
  identityType: true,
  birthDate: true,
  department: true,
  email: true,
  role: true,
  branchId: true,
  branch: { select: { name: true } },
  mustChangePassword: true,
  isActive: true,
} satisfies import("@/lib/generated/prisma/client").Prisma.UserSelect;

export const currentUser = cache(async () => {
  // Session reads also extend idle expiry, so run only on a real request.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: { id: true, expiresAt: true, user: { select: userSelect } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive)
    return null;
  await db.session.updateMany({
    where: { id: session.id, expiresAt: { gt: new Date() } },
    data: {
      lastActiveAt: new Date(),
      expiresAt: new Date(
        Date.now() +
          (session.user.identityType === "PARTICIPANT"
            ? PARTICIPANT_IDLE_MS
            : IDLE_MS),
      ),
    },
  });
  return session.user;
});

export async function requireUser(allowPasswordChange = false) {
  const user = await currentUser();
  if (!user) redirect("/dang-nhap");
  if (user.mustChangePassword && !allowPasswordChange) redirect("/tai-khoan");
  return user;
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user) redirect("/dang-nhap?mode=admin");
  if (user.role !== "ADMIN") redirect("/");
  if (user.mustChangePassword) redirect("/tai-khoan");
  return user;
}

export async function createSession(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { identityType: true },
  });
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      userId,
      tokenHash: tokenHash(token),
      expiresAt: new Date(
        Date.now() +
          (user.identityType === "PARTICIPANT" ? PARTICIPANT_IDLE_MS : IDLE_MS),
      ),
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token)
    await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  jar.delete(SESSION_COOKIE);
}
