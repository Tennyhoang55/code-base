import "server-only";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/auth/session";
import { bestByTopic, normalizeTopicAttempts } from "@/features/quiz/scoring";
import {
  attemptSummary,
  dateRange,
  filters,
  type Search,
} from "@/features/training/queries";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export const staffSelect = {
  id: true,
  employeeCode: true,
  name: true,
  identityType: true,
  birthDate: true,
  department: true,
  email: true,
  branchId: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  branch: { select: { name: true } },
} satisfies Prisma.UserSelect;
export async function getAdminCatalog() {
  await requireAdmin();
  const [topics, branches, settings] = await Promise.all([
    db.topic.findMany({
      orderBy: { sort: "asc" },
      select: {
        id: true,
        code: true,
        part: true,
        title: true,
        sort: true,
        isActive: true,
        timeLimitMin: true,
        _count: { select: { questions: true } },
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
        showAnswers: true,
        allowLeaderboard: true,
        maxAttempts: true,
      },
    }),
  ]);
  return { topics, branches, settings };
}

export async function getEmployees(search: Search = {}) {
  await requireAdmin();
  const f = filters(search);
  return db.user.findMany({
    where: {
      ...(f.branch ? { branchId: f.branch } : {}),
      ...(f.role ? { role: f.role } : {}),
      ...(f.active ? { isActive: f.active === "yes" } : {}),
      ...(f.q
        ? {
            OR: [
              { name: { contains: f.q, mode: "insensitive" } },
              { employeeCode: { contains: f.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { employeeCode: "asc" },
    select: staffSelect,
  });
}

export async function getEmployee(id: string) {
  await requireAdmin();
  const user = await db.user.findUnique({
    where: { id },
    select: {
      ...staffSelect,
      attempts: {
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        select: attemptSummary,
      },
    },
  });
  if (!user) notFound();
  return { ...user, best: Object.fromEntries(bestByTopic(user.attempts)) };
}

export async function getResults(search: Search = {}) {
  await requireAdmin();
  const f = filters(search);
  return db.attempt.findMany({
    where: {
      status: "SUBMITTED",
      submittedAt: dateRange(f),
      ...(f.topic ? { topicId: f.topic === "mixed" ? null : f.topic } : {}),
      ...(f.user ? { userId: f.user } : {}),
      ...(f.branch ? { user: { branchId: f.branch } } : {}),
      ...(f.passed ? { passed: f.passed === "yes" } : {}),
    },
    orderBy: { submittedAt: "desc" },
    select: {
      ...attemptSummary,
      user: {
        select: {
          employeeCode: true,
          name: true,
          birthDate: true,
          department: true,
          branch: { select: { name: true } },
        },
      },
    },
  });
}

export async function getQuestionStats(search: Search = {}) {
  await requireAdmin();
  const f = filters(search);
  const questions = await db.question.findMany({
    where: {
      ...(f.topic && f.topic !== "mixed" ? { topicId: f.topic } : {}),
      ...(f.q ? { text: { contains: f.q, mode: "insensitive" } } : {}),
    },
    orderBy: [{ topic: { sort: "asc" } }, { id: "asc" }],
    select: {
      id: true,
      topicId: true,
      text: true,
      options: true,
      correctIndex: true,
      explanation: true,
      isActive: true,
      topic: { select: { title: true, code: true } },
      snapshots: {
        where: {
          attempt: {
            status: "SUBMITTED",
            submittedAt: dateRange(f),
            ...(f.branch ? { user: { branchId: f.branch } } : {}),
          },
        },
        select: { selectedIndex: true, correctIndex: true },
      },
    },
  });
  return questions.map(({ snapshots, ...q }) => {
    const correct = snapshots.filter(
      (a) => a.selectedIndex === a.correctIndex,
    ).length;
    return {
      ...q,
      count: snapshots.length,
      correct,
      rate: snapshots.length ? (correct / snapshots.length) * 100 : 0,
    };
  });
}

export async function getDashboard(search: Search = {}) {
  await requireAdmin();
  const f = filters(search);
  const [staff, results, catalog, stats] = await Promise.all([
    getEmployees({ branch: f.branch, role: "EMPLOYEE" }),
    getResults(search),
    getAdminCatalog(),
    getQuestionStats(search),
  ]);
  const staffIds = new Set(staff.map((u) => u.id));
  const attempts = results.filter((a) => staffIds.has(a.userId));
  const done = new Set(attempts.map((a) => a.userId));
  const viNow = new Date(Date.now() + 7 * 3600000);
  const monthStart = new Date(
    `${viNow.getUTCFullYear()}-${String(viNow.getUTCMonth() + 1).padStart(2, "0")}-01T00:00:00+07:00`,
  );
  return {
    ...catalog,
    staff: staff.length,
    done: done.size,
    monthly: attempts.filter(
      (a) => a.submittedAt && a.submittedAt >= monthStart,
    ).length,
    rate: attempts.length
      ? (attempts.filter((a) => a.passed).length / attempts.length) * 100
      : 0,
    charts: catalog.topics.map((t) => {
      const relevant = attempts.filter((a) => a.topicId === t.id);
      return {
        ...t,
        total: relevant.length,
        rate: relevant.length
          ? (relevant.filter((a) => a.passed).length / relevant.length) * 100
          : 0,
      };
    }),
    wrong: stats
      .filter((q) => q.count)
      .sort((a, b) => a.rate - b.rate || b.count - a.count)
      .slice(0, 10),
    absent: staff.filter((u) => !done.has(u.id)),
  };
}

export async function getProgress(search: Search = {}) {
  await requireAdmin();
  const f = filters(search);
  const catalog = await getAdminCatalog();
  const [users, active] = await Promise.all([
    db.user.findMany({
      where: { role: "EMPLOYEE", ...(f.branch ? { branchId: f.branch } : {}) },
      orderBy: { employeeCode: "asc" },
      select: {
        ...staffSelect,
        attempts: {
          where: { status: "SUBMITTED", submittedAt: dateRange(f) },
          select: {
            ...attemptSummary,
            questions: {
              select: {
                questionId: true,
                correctIndex: true,
                selectedIndex: true,
              },
            },
          },
        },
      },
    }),
    db.question.findMany({
      where: { isActive: true, topic: { isActive: true } },
      select: { id: true, topicId: true },
    }),
  ]);
  const topics = catalog.topics.filter((t) => t.isActive);
  const rows = users.map(({ attempts, ...user }) => {
    const normalized = normalizeTopicAttempts(attempts, active);
    const best = bestByTopic(normalized);
    const chapters = [...best.values()].filter((a) => a.topicId);
    return {
      ...user,
      best: Object.fromEntries(
        [...best.entries()].map(([key, a]) => [
          key,
          {
            percentage: a.percentage,
            score: a.score,
            total: a.total,
            passed: a.passed,
          },
        ]),
      ),
      sum: chapters.reduce((s, a) => s + a.score, 0),
      done: chapters.length,
      passed: chapters.filter((a) => a.passed).length,
    };
  });
  return { ...catalog, topics, rows, maximum: active.length };
}

export async function getAudit() {
  await requireAdmin();
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      action: true,
      details: true,
      createdAt: true,
      actor: { select: { name: true, employeeCode: true } },
    },
  });
}

export async function exportBank() {
  await requireAdmin();
  const topics = await db.topic.findMany({
    orderBy: { sort: "asc" },
    select: {
      id: true,
      code: true,
      part: true,
      title: true,
      sort: true,
      questions: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          text: true,
          options: true,
          correctIndex: true,
          explanation: true,
        },
      },
    },
  });
  return {
    version: new Date().toISOString().slice(0, 10),
    source: "Sunway Logistics",
    topics: topics.map(({ questions, ...t }) => ({
      ...t,
      questions: questions.map(({ correctIndex, ...q }) => ({
        ...q,
        correct_index: correctIndex,
      })),
    })),
  };
}
