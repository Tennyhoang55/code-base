import { z } from "zod";

export const idSchema = z.string().min(1).max(100);
export const answerMapSchema = z
  .record(idSchema, z.number().int().min(0).max(3))
  .refine((value) => Object.keys(value).length <= 1000);
export const bankSchema = z
  .object({
    version: z.string().max(100).optional(),
    source: z.string().max(500).optional(),
    note: z.string().optional(),
    topics: z
      .array(
        z.object({
          id: idSchema,
          code: z.string().trim().min(1).max(20),
          part: z.string().trim().min(1).max(200),
          title: z.string().trim().min(1).max(300),
          sort: z.number().int().min(0).max(10000),
          questions: z
            .array(
              z.object({
                id: idSchema,
                text: z.string().trim().min(1).max(5000),
                options: z
                  .array(z.string().trim().min(1).max(2000))
                  .length(4)
                  .refine(
                    (options) => new Set(options).size === 4,
                    "Bốn đáp án phải khác nhau.",
                  ),
                correct_index: z.number().int().min(0).max(3),
                explanation: z.string().max(10000),
              }),
            )
            .max(1000),
        }),
      )
      .min(1)
      .max(100),
  })
  .superRefine((bank, ctx) => {
    if (
      bank.topics.reduce((sum, topic) => sum + topic.questions.length, 0) > 5000
    )
      ctx.addIssue({
        code: "custom",
        message: "Mỗi lần nhập tối đa 5.000 câu hỏi.",
      });
    const topicIds = new Set<string>();
    const codes = new Set<string>();
    const questionIds = new Set<string>();
    for (const topic of bank.topics) {
      if (topicIds.has(topic.id) || codes.has(topic.code))
        ctx.addIssue({
          code: "custom",
          message: `Trùng mã chủ đề ${topic.code}`,
        });
      topicIds.add(topic.id);
      codes.add(topic.code);
      for (const q of topic.questions) {
        if (questionIds.has(q.id))
          ctx.addIssue({ code: "custom", message: `Trùng mã câu ${q.id}` });
        questionIds.add(q.id);
      }
    }
  });

export type QuizView = {
  id: string;
  title: string;
  startedAt: string;
  deadlineAt: string | null;
  expiresAt: string;
  serverNow: string;
  questions: {
    id: string;
    text: string;
    options: string[];
    selectedIndex: number | null;
  }[];
};
export type QuizReply = {
  ok: boolean;
  message?: string;
  attemptId?: string;
  status?: "ACTIVE" | "SUBMITTED" | "CANCELLED";
};
