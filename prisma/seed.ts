import "server-only";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import { z } from "zod";
import { bankSchema } from "../features/quiz/schemas";
import { PrismaClient } from "../lib/generated/prisma/client";
import { hashPassword, temporaryPassword } from "../lib/password";

config({ path: [".env.local", ".env"], quiet: true });
const connectionString = z
  .url({ protocol: /^postgres(ql)?$/ })
  .parse(process.env.DATABASE_URL);
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
const bank = bankSchema.parse(
  JSON.parse(readFileSync("prisma/seed-data/questions.json", "utf8")),
);
async function main() {
  try {
    await db.settings.upsert({
      where: { id: "main" },
      create: { id: "main" },
      update: {},
    });
    for (const name of ["Hà Nội", "Hải Phòng", "TP.HCM"])
      await db.branch.upsert({ where: { name }, create: { name }, update: {} });
    for (const topic of bank.topics) {
      await db.topic.upsert({
        where: { id: topic.id },
        create: {
          id: topic.id,
          code: topic.code,
          title: topic.title,
          part: topic.part,
          sort: topic.sort,
        },
        update: {},
      });
      await db.question.createMany({
        data: topic.questions.map((q) => ({
          id: q.id,
          topicId: topic.id,
          text: q.text,
          options: q.options,
          correctIndex: q.correct_index,
          explanation: q.explanation,
        })),
        skipDuplicates: true,
      });
    }
    if (!(await db.user.count({ where: { role: "ADMIN" } }))) {
      const password = temporaryPassword();
      const branch = await db.branch.findUniqueOrThrow({
        where: { name: "Hà Nội" },
        select: { id: true },
      });
      await db.user.create({
        data: {
          employeeCode: "ADMIN",
          name: "Quản trị Sunway",
          role: "ADMIN",
          branchId: branch.id,
          passwordHash: await hashPassword(password),
        },
      });
      mkdirSync(".local", { recursive: true });
      writeFileSync(
        ".local/admin-initial.txt",
        `SUNWAY QUIZ — TÀI KHOẢN QUẢN TRỊ BAN ĐẦU\nMã NV: ADMIN\nMật khẩu tạm: ${password}\n\nĐăng nhập tại /dang-nhap. Bắt buộc đổi mật khẩu ngay lần đầu.\nFile này không được commit và nên xóa sau khi nhận mật khẩu.\n`,
        { mode: 0o600 },
      );
      console.log(
        "Đã tạo quản trị. Mật khẩu tạm chỉ được ghi vào .local/admin-initial.txt (gitignored).",
      );
    }
    console.log(
      `Đã khởi tạo ${bank.topics.length} chủ đề và ${bank.topics.reduce((s, t) => s + t.questions.length, 0)} câu hỏi. Dữ liệu có sẵn được giữ nguyên.`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error("Khởi tạo thất bại. Kiểm tra kết nối database và migration.");
  process.exitCode = 1;
});
