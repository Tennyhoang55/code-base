import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Prisma } from "@/lib/generated/prisma/client";
import { atomic } from "@/lib/transaction";
import { grade } from "./scoring";

export function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function settleAttempt(
  tx: Prisma.TransactionClient,
  id: string,
  now = new Date(),
  submit = false,
) {
  const attempt = await tx.attempt.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      expiresAt: true,
      questions: { select: { correctIndex: true, selectedIndex: true } },
    },
  });
  if (attempt.status !== "ACTIVE") return attempt.status;
  if (
    !submit &&
    (!attempt.deadlineAt || now < attempt.deadlineAt) &&
    now < attempt.expiresAt
  )
    return "ACTIVE";
  if (
    now >= attempt.expiresAt &&
    (!attempt.deadlineAt || attempt.deadlineAt >= attempt.expiresAt)
  ) {
    await tx.attempt.update({
      where: { id },
      data: { status: "CANCELLED", activeKey: null },
    });
    return "CANCELLED";
  }
  const settings = await tx.settings.findUniqueOrThrow({
    where: { id: "main" },
    select: { passThreshold: true },
  });
  const submittedAt =
    attempt.deadlineAt && now > attempt.deadlineAt ? attempt.deadlineAt : now;
  await tx.attempt.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      activeKey: null,
      submittedAt,
      durationSeconds: Math.max(
        0,
        Math.floor(
          (submittedAt.getTime() - attempt.startedAt.getTime()) / 1000,
        ),
      ),
      ...grade(attempt.questions, settings.passThreshold),
    },
  });
  return "SUBMITTED";
}

export async function expireUserAttempt(userId: string) {
  const pending = await db.attempt.findUnique({
    where: { activeKey: userId },
    select: { deadlineAt: true, expiresAt: true },
  });
  const now = new Date();
  if (
    !pending ||
    ((!pending.deadlineAt || now < pending.deadlineAt) &&
      now < pending.expiresAt)
  )
    return;
  return atomic(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { quizRevision: { increment: 1 } },
      select: { id: true },
    });
    const current = await tx.attempt.findUnique({
      where: { activeKey: userId },
      select: { id: true },
    });
    if (current) await settleAttempt(tx, current.id);
  });
}

export async function startAttempt(
  userId: string,
  topicId: string | null,
  replace: boolean,
) {
  return atomic(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { quizRevision: { increment: 1 } },
      select: { id: true },
    });
    const current = await tx.attempt.findUnique({
      where: { activeKey: userId },
      select: { id: true },
    });
    if (current) {
      const status = await settleAttempt(tx, current.id);
      if (status === "ACTIVE") {
        if (!replace)
          throw new AppError(
            "Bạn còn một bài đang làm. Hãy tiếp tục bài đó hoặc xác nhận hủy để bắt đầu bài mới.",
          );
        await tx.attempt.update({
          where: { id: current.id },
          data: { status: "CANCELLED", activeKey: null },
        });
      }
    }
    const settings = await tx.settings.findUniqueOrThrow({
      where: { id: "main" },
    });
    const topic = topicId
      ? await tx.topic.findUnique({
          where: { id: topicId },
          select: { title: true, isActive: true, timeLimitMin: true },
        })
      : null;
    if (topicId && !topic?.isActive)
      throw new AppError("Chủ đề này đang tạm ngưng.");
    const count = await tx.attempt.count({
      where: { userId, topicId, status: "SUBMITTED" },
    });
    if (settings.maxAttempts > 0 && count >= settings.maxAttempts)
      throw new AppError(
        "Bạn đã hết số lượt làm cho bài này. Vui lòng liên hệ quản trị.",
      );
    const bank = await tx.question.findMany({
      where: {
        isActive: true,
        topic: { isActive: true },
        ...(topicId ? { topicId } : {}),
      },
      select: {
        id: true,
        topicId: true,
        text: true,
        options: true,
        correctIndex: true,
        explanation: true,
      },
    });
    if (!bank.length)
      throw new AppError("Chưa có câu hỏi đang bật trong bài này.");
    const questions = shuffle(bank).slice(
      0,
      topicId ? bank.length : settings.mixedCount,
    );
    const startedAt = new Date();
    const attempt = await tx.attempt.create({
      data: {
        userId,
        topicId,
        title: topic?.title ?? "Thi tổng hợp",
        activeKey: userId,
        total: questions.length,
        startedAt,
        expiresAt: new Date(startedAt.getTime() + 24 * 60 * 60000),
        deadlineAt: topic?.timeLimitMin
          ? new Date(startedAt.getTime() + topic.timeLimitMin * 60000)
          : null,
        questions: {
          create: questions.map((q, position) => {
            const order = shuffle(
              q.options.map((text, index) => ({ text, index })),
            );
            return {
              questionId: q.id,
              topicId: q.topicId,
              position,
              text: q.text,
              explanation: q.explanation,
              options: order.map((o) => o.text),
              correctIndex: order.findIndex((o) => o.index === q.correctIndex),
            };
          }),
        },
      },
      select: { id: true },
    });
    return attempt.id;
  });
}

export async function writeAnswers(
  userId: string,
  id: string,
  answers: Record<string, number>,
  submit = false,
) {
  return atomic(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { quizRevision: { increment: 1 } },
      select: { id: true },
    });
    const attempt = await tx.attempt.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!attempt) throw new AppError("Không tìm thấy bài làm của bạn.");
    const status = await settleAttempt(tx, id);
    if (status !== "ACTIVE") return status;
    const questions = await tx.attemptQuestion.findMany({
      where: { attemptId: id },
      select: { id: true },
    });
    if (
      Object.keys(answers).some((key) => !questions.some((q) => q.id === key))
    )
      throw new AppError("Đáp án không thuộc bài làm này. Hãy tải lại trang.");
    const now = new Date();
    for (const [questionId, selectedIndex] of Object.entries(answers)) {
      await tx.attemptQuestion.update({
        where: { id: questionId },
        data: { selectedIndex, answeredAt: now },
      });
    }
    return submit ? settleAttempt(tx, id, new Date(), true) : "ACTIVE";
  });
}
