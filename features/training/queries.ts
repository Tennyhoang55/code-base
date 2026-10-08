import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { expireUserAttempt } from "@/features/quiz/engine";
import type { QuizView } from "@/features/quiz/schemas";
import {
  bestByTopic,
  compareBest,
  normalizeTopicAttempts,
} from "@/features/quiz/scoring";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Prisma } from "@/lib/generated/prisma/client";

export type Search = Record<string, string | string[] | undefined>;
const filterSchema = z.object({
  branch: z.string().max(100).catch(""),
  topic: z.string().max(100).catch(""),
  period: z.enum(["all", "month", "custom"]).catch("all"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .catch(""),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .catch(""),
  user: z.string().max(100).catch(""),
  passed: z.enum(["", "yes", "no"]).catch(""),
  q: z.string().max(200).catch(""),
  role: z.enum(["", "ADMIN", "EMPLOYEE"]).catch(""),
  active: z.enum(["", "yes", "no"]).catch(""),
});
export function filters(search: Search) {
  return filterSchema.parse(search);
}
export function dateRange(f: ReturnType<typeof filters>) {
  if (f.period === "month") {
    const now = new Date(Date.now() + 7 * 3600000);
    return {
      gte: new Date(
        `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01T00:00:00+07:00`,
      ),
    };
  }
  if (f.period !== "custom") return undefined;
  const from = f.from ? new Date(`${f.from}T00:00:00+07:00`) : undefined;
  const to = f.to ? new Date(`${f.to}T00:00:00+07:00`) : undefined;
  return {
    ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}),
    ...(to && !Number.isNaN(to.getTime())
      ? { lt: new Date(to.getTime() + 86400000) }
      : {}),
  };
}

export const attemptSummary = {
  id: true,
  userId: true,
  topicId: true,
  title: true,
  score: true,
  total: true,
  percentage: true,
  durationSeconds: true,
  submittedAt: true,
  passed: true,
  passThreshold: true,
} satisfies Prisma.AttemptSelect;

async function catalog() {
  const [topics, branches, settings] = await Promise.all([
    db.topic.findMany({
      where: { isActive: true },
      orderBy: { sort: "asc" },
      select: {
        id: true,
        code: true,
        title: true,
        part: true,
        sort: true,
        timeLimitMin: true,
        _count: { select: { questions: { where: { isActive: true } } } },
      },
    }),
    db.branch.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.settings.findUniqueOrThrow({
      where: { id: "main" },
      select: {
        passThreshold: true,
        mixedCount: true,
        maxAttempts: true,
        showAnswers: true,
        allowLeaderboard: true,
      },
    }),
  ]);
  return {
    topics,
    branches,
    settings,
    maximum: topics.reduce((sum, t) => sum + t._count.questions, 0),
  };
}

export async function getCatalog() {
  await requireUser();
  return catalog();
}

export async function getNavigationSettings() {
  await requireUser(true);
  return db.settings.findUniqueOrThrow({
    where: { id: "main" },
    select: { allowLeaderboard: true },
  });
}

async function rankings(search: Search) {
  const f = filters(search);
  const c = await catalog();
  const users = await db.user.findMany({
    where: {
      role: "EMPLOYEE",
      isActive: true,
      ...(f.branch ? { branchId: f.branch } : {}),
    },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      branch: { select: { name: true } },
      attempts: {
        where: { status: "SUBMITTED", submittedAt: dateRange(f) },
        select: {
          ...attemptSummary,
          questions: {
            select: {
              questionId: true,
              topicId: true,
              correctIndex: true,
              selectedIndex: true,
            },
          },
        },
      },
    },
  });
  const active = await db.question.findMany({
    where: { isActive: true, topic: { isActive: true } },
    select: { id: true, topicId: true },
  });
  const rows = users
    .map((user) => {
      const normalized = normalizeTopicAttempts(user.attempts, active);
      const best = bestByTopic(normalized);
      const chapterBest = [...best.values()].filter((a) => a.topicId !== null);
      const selected = best.get(f.topic || "all");
      return {
        id: user.id,
        employeeCode: user.employeeCode,
        name: user.name,
        branch: user.branch.name,
        sum: chapterBest.reduce((sum, a) => sum + a.score, 0),
        done: chapterBest.length,
        passed: chapterBest.filter((a) => a.passed).length,
        seconds: chapterBest.reduce((sum, a) => sum + a.durationSeconds, 0),
        best: selected
          ? {
              id: selected.id,
              topicId: selected.topicId,
              score: selected.score,
              total: selected.total,
              percentage: selected.percentage,
              durationSeconds: selected.durationSeconds,
              submittedAt: selected.submittedAt,
              passed: selected.passed,
            }
          : null,
        attempts: normalized.filter((a) => (a.topicId ?? "mixed") === f.topic)
          .length,
        byTopic: Object.fromEntries(
          [...best.entries()].map(([key, a]) => [
            key,
            {
              score: a.score,
              total: a.total,
              percentage: a.percentage,
              passed: a.passed,
            },
          ]),
        ),
      };
    })
    .filter((row) =>
      f.topic && f.topic !== "all" ? row.best !== null : row.done > 0,
    );
  rows.sort((a, b) =>
    f.topic && f.topic !== "all" && a.best && b.best
      ? compareBest(a.best, b.best)
      : b.sum - a.sum ||
        b.done - a.done ||
        a.seconds - b.seconds ||
        a.employeeCode.localeCompare(b.employeeCode),
  );
  return { ...c, rows };
}

export async function getLeaderboard(search: Search = {}) {
  const user = await requireUser();
  const settings = await db.settings.findUniqueOrThrow({
    where: { id: "main" },
    select: { allowLeaderboard: true },
  });
  if (user.role !== "ADMIN" && !settings.allowLeaderboard)
    throw new AppError("Bảng xếp hạng đang được quản trị tạm ẩn.");
  return rankings(search);
}

export async function getHome() {
  const user = await requireUser();
  await expireUserAttempt(user.id);
  const [board, attempts, active, activeQuestions] = await Promise.all([
    rankings({}),
    db.attempt.findMany({
      where: { userId: user.id, status: "SUBMITTED" },
      select: {
        ...attemptSummary,
        questions: {
          select: { questionId: true, correctIndex: true, selectedIndex: true },
        },
      },
    }),
    db.attempt.findUnique({
      where: { activeKey: user.id },
      select: { id: true, title: true, startedAt: true },
    }),
    db.question.findMany({
      where: { isActive: true, topic: { isActive: true } },
      select: { id: true, topicId: true },
    }),
  ]);
  const mine = board.rows.find((r) => r.id === user.id);
  const best = bestByTopic(attempts);
  const chapterBest = [
    ...bestByTopic(normalizeTopicAttempts(attempts, activeQuestions)).values(),
  ].filter((a) => a.topicId);
  return {
    user,
    ...board,
    mine: mine ?? {
      done: chapterBest.length,
      sum: chapterBest.reduce((sum, a) => sum + a.score, 0),
    },
    rank: mine ? board.rows.findIndex((r) => r.id === user.id) + 1 : null,
    best: Object.fromEntries(
      [...best.entries()].map(([key, a]) => [
        key,
        {
          score: a.score,
          total: a.total,
          percentage: a.percentage,
          passed: a.passed,
        },
      ]),
    ),
    counts: Object.fromEntries(
      [...new Set(attempts.map((a) => a.topicId ?? "mixed"))].map((key) => [
        key,
        attempts.filter((a) => (a.topicId ?? "mixed") === key).length,
      ]),
    ),
    active,
  };
}

export async function getAttemptStatus(id: string) {
  const user = await requireUser();
  await expireUserAttempt(user.id);
  const attempt = await db.attempt.findFirst({
    where: { id, userId: user.id },
    select: { status: true },
  });
  if (!attempt) notFound();
  return attempt.status;
}

export async function getQuiz(id: string): Promise<QuizView | null> {
  const user = await requireUser();
  await expireUserAttempt(user.id);
  const attempt = await db.attempt.findFirst({
    where: { id, userId: user.id, status: "ACTIVE" },
    select: {
      id: true,
      title: true,
      startedAt: true,
      deadlineAt: true,
      expiresAt: true,
      questions: {
        orderBy: { position: "asc" },
        select: { id: true, text: true, options: true, selectedIndex: true },
      },
    },
  });
  if (!attempt) return null;
  return {
    ...attempt,
    startedAt: attempt.startedAt.toISOString(),
    deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
    expiresAt: attempt.expiresAt.toISOString(),
    serverNow: new Date().toISOString(),
  };
}

export async function getResult(id: string) {
  const user = await requireUser();
  await expireUserAttempt(user.id);
  const settings = await db.settings.findUniqueOrThrow({
    where: { id: "main" },
    select: { showAnswers: true, allowLeaderboard: true, maxAttempts: true },
  });
  const attempt = await db.attempt.findFirst({
    where: {
      id,
      status: "SUBMITTED",
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
    },
    select: {
      ...attemptSummary,
      user: { select: { name: true, employeeCode: true } },
      ...(settings.showAnswers || user.role === "ADMIN"
        ? {
            questions: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                text: true,
                options: true,
                selectedIndex: true,
                correctIndex: true,
                explanation: true,
              },
            },
          }
        : {}),
    },
  });
  if (!attempt) notFound();
  const [active, count, available] = await Promise.all([
    db.attempt.findUnique({
      where: { activeKey: user.id },
      select: { id: true },
    }),
    db.attempt.count({
      where: { userId: user.id, topicId: attempt.topicId, status: "SUBMITTED" },
    }),
    db.question.count({
      where: {
        isActive: true,
        topic: { isActive: true },
        ...(attempt.topicId ? { topicId: attempt.topicId } : {}),
      },
    }),
  ]);
  const board =
    settings.allowLeaderboard || user.role === "ADMIN"
      ? await rankings({ topic: attempt.topicId ?? "mixed" })
      : null;
  return {
    ...attempt,
    questions: "questions" in attempt ? attempt.questions : [],
    allowLeaderboard: settings.allowLeaderboard || user.role === "ADMIN",
    rank: board ? board.rows.findIndex((r) => r.id === attempt.userId) + 1 : 0,
    rankTotal: board?.rows.length ?? 0,
    hasActive: !!active,
    exhausted: settings.maxAttempts > 0 && count >= settings.maxAttempts,
    canRetry:
      available > 0 &&
      (settings.maxAttempts === 0 || count < settings.maxAttempts),
  };
}

export async function getHistory(search: Search = {}) {
  const user = await requireUser();
  const f = filters(search);
  const [c, attempts] = await Promise.all([
    catalog(),
    db.attempt.findMany({
      where: {
        userId: user.id,
        status: "SUBMITTED",
        ...(f.topic ? { topicId: f.topic === "mixed" ? null : f.topic } : {}),
      },
      orderBy: { submittedAt: "desc" },
      select: attemptSummary,
    }),
  ]);
  return { ...c, attempts };
}

export async function getAdminRanking(search: Search) {
  const { requireAdmin } = await import("@/features/auth/session");
  await requireAdmin();
  return rankings(search);
}
