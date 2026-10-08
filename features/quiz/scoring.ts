export type ScoreAttempt = {
  id: string;
  topicId: string | null;
  score: number;
  total: number;
  percentage: number;
  durationSeconds: number;
  submittedAt: Date | null;
  passed: boolean;
};

export function compareBest(a: ScoreAttempt, b: ScoreAttempt) {
  return (
    b.percentage - a.percentage ||
    a.durationSeconds - b.durationSeconds ||
    (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0) ||
    a.id.localeCompare(b.id)
  );
}

export function bestByTopic<T extends ScoreAttempt>(attempts: T[]) {
  const best = new Map<string, T>();
  for (const attempt of attempts) {
    const key = attempt.topicId ?? "mixed";
    const current = best.get(key);
    if (!current || compareBest(attempt, current) < 0) best.set(key, attempt);
  }
  return best;
}

export function normalizeTopicAttempts<
  T extends ScoreAttempt & {
    passThreshold: number;
    questions: {
      questionId: string;
      selectedIndex: number | null;
      correctIndex: number;
    }[];
  },
>(attempts: T[], active: { id: string; topicId: string }[]) {
  const currentTopics = new Map(active.map((q) => [q.id, q.topicId]));
  const counts = new Map<string, number>();
  for (const q of active)
    counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1);
  return attempts
    .filter((a) => !a.topicId || counts.has(a.topicId))
    .map((a) => {
      if (!a.topicId) return a;
      const total = counts.get(a.topicId) ?? 0;
      const score = a.questions.filter(
        (q) =>
          currentTopics.get(q.questionId) === a.topicId &&
          q.selectedIndex !== null &&
          q.selectedIndex === q.correctIndex,
      ).length;
      const percentage = total ? (score / total) * 100 : 0;
      return {
        ...a,
        score,
        total,
        percentage,
        passed: percentage >= a.passThreshold,
      };
    });
}

export function grade(
  questions: { selectedIndex: number | null; correctIndex: number }[],
  threshold: number,
) {
  const score = questions.filter(
    (q) => q.selectedIndex !== null && q.selectedIndex === q.correctIndex,
  ).length;
  const total = questions.length;
  const percentage = total ? (score / total) * 100 : 0;
  return {
    score,
    total,
    percentage,
    passed: percentage >= threshold,
    passThreshold: threshold,
  };
}
