import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { config, parse } from "dotenv";

// Integration tests run only through scripts/verify.mjs on the isolated branch.
const testEnvironment = parse(readFileSync(".local/test.env", "utf8"));
const liveEnvironment = parse(readFileSync(".env.local", "utf8"));
config({ path: ".local/test.env", quiet: true });

test("database: lưu đáp án, chấm điểm, snapshot, giới hạn giờ và một bài đang làm", async () => {
  assert.equal(process.env.DATABASE_URL, testEnvironment.DATABASE_URL);
  assert.notEqual(process.env.DATABASE_URL, liveEnvironment.DATABASE_URL);
  const { db } = await import("../lib/db");
  const { startAttempt, writeAnswers, expireUserAttempt } = await import(
    "../features/quiz/engine"
  );
  const branch = await db.branch.findUniqueOrThrow({
    where: { name: "Hà Nội" },
  });
  const code = `TEST_${Date.now()}`;
  const user = await db.user.create({
    data: {
      employeeCode: code,
      name: "Nhân sự kiểm thử",
      branchId: branch.id,
      identityType: "PARTICIPANT",
      birthDate: new Date("2001-05-20T00:00:00Z"),
      department: "OPS",
      passwordHash: null,
      mustChangePassword: false,
    },
  });
  const settings = await db.settings.findUniqueOrThrow({
    where: { id: "main" },
  });
  const question = await db.question.findUniqueOrThrow({
    where: { id: "c05-q01" },
  });
  try {
    // Database guards also prevent privilege/credential changes outside the UI.
    await assert.rejects(() =>
      db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } }),
    );
    await assert.rejects(() =>
      db.user.update({
        where: { id: user.id },
        data: { passwordHash: "invalid" },
      }),
    );
    await assert.rejects(() =>
      db.user.update({ where: { id: user.id }, data: { department: "Khác" } }),
    );
    const first = await startAttempt(user.id, "c05", false);
    const initial = await db.attempt.findUniqueOrThrow({
      where: { id: first },
      include: { questions: { orderBy: { position: "asc" } } },
    });
    assert.equal(initial.questions.length, 23);
    await assert.rejects(() => startAttempt(user.id, "c01", false));
    const answer = initial.questions[0];
    await writeAnswers(user.id, first, { [answer.id]: answer.correctIndex });
    assert.equal(
      (await db.attemptQuestion.findUniqueOrThrow({ where: { id: answer.id } }))
        .selectedIndex,
      answer.correctIndex,
    );
    await db.question.update({
      where: { id: question.id },
      data: { text: "Nội dung vừa sửa", isActive: false },
    });
    assert.equal(
      (
        await db.attemptQuestion.findFirstOrThrow({
          where: { attemptId: first, questionId: question.id },
        })
      ).text,
      question.text,
    );
    assert.equal(
      await db.question.count({
        where: { isActive: true, topic: { isActive: true } },
      }),
      221,
    );
    await db.settings.update({
      where: { id: "main" },
      data: { passThreshold: 70 },
    });
    const answers = Object.fromEntries(
      initial.questions.slice(0, 17).map((q) => [q.id, q.correctIndex]),
    );
    assert.equal(
      await writeAnswers(user.id, first, answers, true),
      "SUBMITTED",
    );
    const submitted = await db.attempt.findUniqueOrThrow({
      where: { id: first },
    });
    assert.equal(submitted.score, 17);
    assert.equal(submitted.passThreshold, 70);
    assert.equal(submitted.passed, true);
    await db.settings.update({
      where: { id: "main" },
      data: { maxAttempts: 1 },
    });
    await assert.rejects(() => startAttempt(user.id, "c05", false));
    await db.settings.update({
      where: { id: "main" },
      data: { maxAttempts: 0 },
    });
    await db.question.update({
      where: { id: question.id },
      data: { text: question.text, isActive: true },
    });
    const repeatId = await startAttempt(user.id, "c05", false);
    const repeat = await db.attemptQuestion.findMany({
      where: { attemptId: repeatId },
      orderBy: { position: "asc" },
    });
    assert.notDeepEqual(
      repeat.map((q) => q.questionId),
      initial.questions.map((q) => q.questionId),
    );
    assert.ok(
      repeat.some(
        (q) =>
          JSON.stringify(q.options) !==
          JSON.stringify(
            initial.questions.find((old) => old.questionId === q.questionId)
              ?.options,
          ),
      ),
    );
    const mixed = await startAttempt(user.id, null, true);
    assert.equal(
      await db.attemptQuestion.count({ where: { attemptId: mixed } }),
      40,
    );
    await writeAnswers(
      user.id,
      first,
      Object.fromEntries(initial.questions.map((q) => [q.id, q.correctIndex])),
      true,
    );
    assert.equal(
      (await db.attempt.findUniqueOrThrow({ where: { id: first } })).score,
      17,
    );
    const second = await startAttempt(user.id, "c01", true);
    await db.attempt.update({
      where: { id: second },
      data: { deadlineAt: new Date(Date.now() - 1000) },
    });
    assert.equal(await writeAnswers(user.id, second, {}), "SUBMITTED");
    const third = await startAttempt(user.id, "c01", false);
    await db.attempt.update({
      where: { id: third },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expireUserAttempt(user.id);
    assert.equal(
      (await db.attempt.findUniqueOrThrow({ where: { id: third } })).status,
      "CANCELLED",
    );
    const concurrent = await Promise.allSettled([
      startAttempt(user.id, "c01", false),
      startAttempt(user.id, "c02", false),
    ]);
    assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      await db.attempt.count({ where: { userId: user.id, status: "ACTIVE" } }),
      1,
    );
  } finally {
    await db.question.update({
      where: { id: question.id },
      data: { text: question.text, isActive: question.isActive },
    });
    await db.settings.update({
      where: { id: "main" },
      data: {
        passThreshold: settings.passThreshold,
        maxAttempts: settings.maxAttempts,
      },
    });
    await db.attempt.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
