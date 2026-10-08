"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { actionMessage } from "@/lib/errors";
import { atomic } from "@/lib/transaction";
import { startAttempt, writeAnswers } from "./engine";
import { answerMapSchema, idSchema, type QuizReply } from "./schemas";

export async function beginQuiz(input: unknown): Promise<QuizReply> {
  const user = await requireUser();
  const parsed = z
    .object({ topicId: idSchema.nullable(), replace: z.boolean() })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Thông tin bài thi không hợp lệ." };
  try {
    const attemptId = await startAttempt(
      user.id,
      parsed.data.topicId,
      parsed.data.replace,
    );
    revalidatePath("/");
    return { ok: true, attemptId };
  } catch (error) {
    return { ok: false, message: actionMessage(error) };
  }
}

export async function saveQuiz(input: unknown): Promise<QuizReply> {
  const user = await requireUser();
  const parsed = z
    .object({
      id: idSchema,
      answers: answerMapSchema,
      submit: z.boolean().default(false),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "Đáp án không hợp lệ." };
  try {
    const status = await writeAnswers(
      user.id,
      parsed.data.id,
      parsed.data.answers,
      parsed.data.submit,
    );
    if (status !== "ACTIVE") revalidatePath("/", "layout");
    return { ok: true, status, attemptId: parsed.data.id };
  } catch (error) {
    return { ok: false, message: actionMessage(error) };
  }
}

export async function cancelQuiz(input: unknown): Promise<QuizReply> {
  const user = await requireUser();
  const id = idSchema.safeParse(input);
  if (!id.success) return { ok: false, message: "Mã bài không hợp lệ." };
  await atomic(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { quizRevision: { increment: 1 } },
      select: { id: true },
    });
    await tx.attempt.updateMany({
      where: { id: id.data, userId: user.id, status: "ACTIVE" },
      data: { status: "CANCELLED", activeKey: null },
    });
  });
  revalidatePath("/");
  return { ok: true, status: "CANCELLED" };
}

export async function keepSessionAlive() {
  await requireUser(true);
}
