import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bankSchema } from "../features/quiz/schemas";
import {
  bestByTopic,
  compareBest,
  grade,
  normalizeTopicAttempts,
} from "../features/quiz/scoring";
import { hashPassword, verifyPassword } from "../lib/password";

test("ngân hàng có đúng 17 chủ đề, 222 câu và chương 05 có 23 câu", () => {
  const bank = bankSchema.parse(
    JSON.parse(readFileSync("prisma/seed-data/questions.json", "utf8")),
  );
  assert.equal(bank.topics.length, 17);
  assert.equal(
    bank.topics.reduce((sum, t) => sum + t.questions.length, 0),
    222,
  );
  assert.equal(bank.topics.find((t) => t.code === "05")?.questions.length, 23);
  assert.ok(
    bank.topics
      .flatMap((t) => t.questions)
      .every((q) => q.correct_index === 0 && q.options.length === 4),
  );
});
test("câu bỏ trống sai, điểm đạt theo ngưỡng tại lúc nộp", () => {
  const questions = Array.from({ length: 10 }, (_, i) => ({
    correctIndex: 0,
    selectedIndex: i < 7 ? 0 : i === 7 ? null : 1,
  }));
  assert.deepEqual(grade(questions, 80), {
    score: 7,
    total: 10,
    percentage: 70,
    passed: false,
    passThreshold: 80,
  });
  assert.equal(grade(questions, 70).passed, true);
});
test("lượt tốt nhất ưu tiên %, tốc độ, rồi thời điểm đạt; tổng hợp riêng", () => {
  const base = {
    score: 8,
    total: 10,
    percentage: 80,
    passed: true,
    topicId: "c01",
    durationSeconds: 60,
    submittedAt: new Date("2026-10-08T00:00:00Z"),
  };
  const a = { ...base, id: "a" };
  const faster = { ...base, id: "b", durationSeconds: 50 };
  const earlier = {
    ...faster,
    id: "c",
    submittedAt: new Date("2026-10-07T00:00:00Z"),
  };
  assert.ok(compareBest(faster, a) < 0);
  assert.ok(compareBest(earlier, faster) < 0);
  const best = bestByTopic([
    a,
    faster,
    earlier,
    { ...base, id: "mixed", topicId: null, percentage: 100 },
  ]);
  assert.equal(best.get("c01")?.id, "c");
  assert.equal(best.get("mixed")?.id, "mixed");
  assert.equal(
    [...best.values()]
      .filter((v) => v.topicId !== null)
      .reduce((sum, v) => sum + v.score, 0),
    8,
  );
});
test("mật khẩu được salt riêng và xác minh đúng, sai, Unicode", async () => {
  const password = "Mật khẩu Sunway 2026!";
  const a = await hashPassword(password);
  const b = await hashPassword(password);
  assert.notEqual(a, b);
  assert.ok(!a.includes(password));
  assert.equal(await verifyPassword(password, a), true);
  assert.equal(await verifyPassword("sai", a), false);
});

test("ẩn hoặc chuyển câu không làm tổng điểm vượt ngân hàng đang bật; lịch sử giữ nguyên", () => {
  const attempt = {
    id: "old",
    topicId: "c01",
    score: 3,
    total: 3,
    percentage: 100,
    passed: true,
    passThreshold: 80,
    durationSeconds: 30,
    submittedAt: new Date(),
    questions: ["kept", "hidden", "moved"].map((questionId) => ({
      questionId,
      selectedIndex: 0,
      correctIndex: 0,
    })),
  };
  const active = [
    { id: "kept", topicId: "c01" },
    { id: "new", topicId: "c01" },
    { id: "moved", topicId: "c02" },
  ];
  const [normalized] = normalizeTopicAttempts([attempt], active);
  assert.equal(normalized.score, 1);
  assert.equal(normalized.total, 2);
  assert.equal(normalized.percentage, 50);
  assert.equal(normalized.passed, false);
  assert.equal(attempt.score, 3);
  assert.equal(attempt.percentage, 100);
});
