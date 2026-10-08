"use server";

import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { birthDateSchema, departmentSchema } from "@/features/auth/schemas";
import { requireAdmin } from "@/features/auth/session";
import { bankSchema, idSchema } from "@/features/quiz/schemas";
import { db } from "@/lib/db";
import { AppError, actionMessage } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import { hashPassword, temporaryPassword } from "@/lib/password";
import { atomic } from "@/lib/transaction";
import { readEmployees } from "./imports";
import { type AdminState, employeeSchema } from "./schemas";

function refresh() {
  revalidatePath("/", "layout");
}
function fields(data: FormData) {
  return Object.fromEntries(data);
}
const checked = (value: FormDataEntryValue | null) => value === "on";

export async function saveEmployee(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();
  const parsed = employeeSchema
    .extend({
      id: z.string().max(100).optional(),
      role: z.enum(["EMPLOYEE", "ADMIN"]),
      birthDate: birthDateSchema.optional(),
      department: departmentSchema.optional(),
    })
    .safeParse(fields(form));
  if (!parsed.success)
    return { message: parsed.error.issues.map((i) => i.message).join(". ") };
  const { id, role, ...person } = parsed.data;
  const isActive = checked(form.get("isActive"));
  if (id === actor.id && (role !== "ADMIN" || !isActive))
    return {
      message: "Không thể tự khóa hoặc hạ quyền tài khoản quản trị đang dùng.",
    };
  try {
    const password = id ? undefined : temporaryPassword();
    const passwordHash = password ? await hashPassword(password) : undefined;
    await atomic(async (tx) => {
      if (
        !(await tx.branch.findUnique({
          where: { id: person.branchId },
          select: { id: true },
        }))
      )
        throw new AppError("Chi nhánh không tồn tại.");
      const data = { ...person, email: person.email || null, role, isActive };
      if (id) {
        const existing = await tx.user.findUniqueOrThrow({
          where: { id },
          select: { identityType: true },
        });
        if (
          existing.identityType === "PARTICIPANT" &&
          (role !== "EMPLOYEE" || !person.birthDate || !person.department)
        )
          throw new AppError(
            "Hồ sơ người làm bài cần ngày sinh, phòng ban và không thể cấp quyền quản trị. Hãy tạo quản trị riêng.",
          );
        await tx.user.update({
          where: { id },
          data: {
            ...data,
            birthDate: person.birthDate
              ? new Date(`${person.birthDate}T00:00:00Z`)
              : undefined,
          },
        });
        if (existing.identityType === "ACCOUNT" || !isActive)
          await tx.session.deleteMany({ where: { userId: id } });
      } else if (passwordHash)
        await tx.user.create({
          data: {
            ...data,
            birthDate: person.birthDate
              ? new Date(`${person.birthDate}T00:00:00Z`)
              : undefined,
            passwordHash,
          },
        });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: id ? "Sửa nhân sự / trạng thái" : "Thêm nhân sự",
          details: `${person.employeeCode} · ${isActive ? "Hoạt động" : "Khóa"} · ${role}`,
        },
      });
    });
    refresh();
    return {
      success: true,
      message: "Đã lưu nhân sự.",
      password,
      employeeCode: person.employeeCode,
    };
  } catch (error) {
    return {
      message:
        error instanceof Error && "code" in error && error.code === "P2002"
          ? "Mã nhân viên đã tồn tại."
          : actionMessage(error),
    };
  }
}

export async function resetPassword(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success || id.data === actor.id)
    return { message: "Đổi mật khẩu của chính bạn tại mục Tài khoản." };
  try {
    const password = temporaryPassword();
    const passwordHash = await hashPassword(password);
    const result = await atomic(async (tx) => {
      const existing = await tx.user.findUniqueOrThrow({
        where: { id: id.data },
        select: { identityType: true },
      });
      if (existing.identityType === "PARTICIPANT")
        throw new AppError(
          "Người làm bài không dùng mật khẩu; không cần đặt lại.",
        );
      const user = await tx.user.update({
        where: { id: id.data },
        data: {
          passwordHash,
          mustChangePassword: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        select: { employeeCode: true },
      });
      await tx.session.deleteMany({ where: { userId: id.data } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "Đặt lại mật khẩu",
          details: user.employeeCode,
        },
      });
      return user;
    });
    refresh();
    return {
      success: true,
      message:
        "Mật khẩu tạm chỉ hiển thị trong lượt này. Nhân sự sẽ phải đổi khi đăng nhập.",
      password,
      employeeCode: result.employeeCode,
    };
  } catch (error) {
    return { message: actionMessage(error) };
  }
}

export async function saveBranch(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();
  const parsed = z
    .object({
      id: z.string().max(100).optional(),
      name: z.string().trim().min(2).max(100),
    })
    .safeParse(fields(form));
  if (!parsed.success)
    return { message: "Nhập tên chi nhánh từ 2 đến 100 ký tự." };
  try {
    await atomic(async (tx) => {
      await tx.branch.upsert({
        where: { id: parsed.data.id || randomUUID() },
        create: { name: parsed.data.name },
        update: { name: parsed.data.name },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "Sửa chi nhánh",
          details: parsed.data.name,
        },
      });
    });
    refresh();
    return { success: true, message: "Đã lưu chi nhánh." };
  } catch {
    return { message: "Không thể lưu. Tên chi nhánh có thể đã tồn tại." };
  }
}

export async function saveSettings(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();
  const parsed = z
    .object({
      passThreshold: z.coerce.number().int().min(1).max(100),
      mixedCount: z.coerce.number().int().min(1).max(1000),
      maxAttempts: z.coerce.number().int().min(0).max(1000),
    })
    .safeParse(fields(form));
  if (!parsed.success)
    return { message: "Ngưỡng đạt 1–100%, số câu 1–1.000, số lượt 0–1.000." };
  try {
    await atomic(async (tx) => {
      const data = {
        ...parsed.data,
        showAnswers: checked(form.get("showAnswers")),
        allowLeaderboard: checked(form.get("allowLeaderboard")),
      };
      await tx.settings.update({ where: { id: "main" }, data });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "Đổi cấu hình",
          details: JSON.stringify(data),
        },
      });
    });
    refresh();
    return {
      success: true,
      message: "Đã lưu cấu hình. Ngưỡng đạt áp dụng cho bài nộp từ bây giờ.",
    };
  } catch (error) {
    return { message: actionMessage(error) };
  }
}

export async function saveTopic(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();
  const parsed = z
    .object({
      id: idSchema,
      title: z.string().trim().min(1).max(300),
      part: z.string().trim().min(1).max(200),
      sort: z.coerce.number().int().min(0).max(10000),
      timeLimitMin: z.preprocess(
        (v) => (v === "" ? null : v),
        z.coerce.number().int().min(1).max(1440).nullable(),
      ),
    })
    .safeParse(fields(form));
  if (!parsed.success)
    return {
      message:
        "Kiểm tra tên, nhóm, thứ tự và thời gian (1–1.440 phút hoặc để trống).",
    };
  try {
    await atomic(async (tx) => {
      const { id, ...data } = parsed.data;
      await tx.topic.update({
        where: { id },
        data: { ...data, isActive: checked(form.get("isActive")) },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "Sửa chủ đề",
          details: `${id}: ${data.title}`,
        },
      });
    });
    refresh();
    return {
      success: true,
      message: "Đã lưu chủ đề. Thời gian mới áp dụng cho lượt bắt đầu sau.",
    };
  } catch (error) {
    return { message: actionMessage(error) };
  }
}

export async function saveQuestion(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();
  const parsed = z
    .object({
      id: z.string().max(100).optional(),
      topicId: idSchema,
      text: z.string().trim().min(1).max(5000),
      options: z
        .array(z.string().trim().min(1).max(2000))
        .length(4)
        .refine((v) => new Set(v).size === 4),
      correctIndex: z.coerce.number().int().min(0).max(3),
      explanation: z.string().max(10000),
    })
    .safeParse({ ...fields(form), options: form.getAll("options") });
  if (!parsed.success)
    return {
      message: "Nhập nội dung, 4 đáp án khác nhau và chọn đúng 1 đáp án đúng.",
    };
  try {
    await atomic(async (tx) => {
      const { id, ...data } = parsed.data;
      const key = id || randomUUID();
      await tx.question.upsert({
        where: { id: key },
        create: { id: key, ...data, isActive: checked(form.get("isActive")) },
        update: { ...data, isActive: checked(form.get("isActive")) },
      });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "Sửa câu hỏi", details: key },
      });
    });
    refresh();
    return {
      success: true,
      message: "Đã lưu câu hỏi. Bài làm cũ giữ nguyên nội dung.",
    };
  } catch (error) {
    return { message: actionMessage(error) };
  }
}

export async function previewEmployees(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File)) return { message: "Chọn file cần nhập." };
  try {
    const result = await readEmployees(file);
    return {
      payload: JSON.stringify(result.rows),
      preview: {
        total: result.total,
        valid: result.rows.length,
        errors: result.errors,
      },
      message:
        "Chưa nhập dữ liệu. Kiểm tra các dòng rồi xác nhận nhập dòng hợp lệ.",
    };
  } catch (error) {
    return { message: actionMessage(error) };
  }
}

export async function importEmployees(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();
  const payload = z.string().max(500000).safeParse(form.get("payload"));
  if (!payload.success) return { message: "Dữ liệu nhập không hợp lệ." };
  try {
    const rows = z
      .array(employeeSchema)
      .min(1)
      .max(1000)
      .parse(JSON.parse(payload.data));
    if (new Set(rows.map((r) => r.employeeCode)).size !== rows.length)
      throw new AppError("Có mã NV trùng nhau.");
    const credentials = rows.map((row) => ({
      employeeCode: row.employeeCode,
      password: temporaryPassword(),
    }));
    const prepared: {
      employeeCode: string;
      name: string;
      branchId: string;
      email: string | null;
      passwordHash: string;
    }[] = [];
    for (let i = 0; i < rows.length; i++)
      prepared.push({
        ...rows[i],
        email: rows[i].email || null,
        passwordHash: await hashPassword(credentials[i].password),
      });
    await atomic(async (tx) => {
      const branches = new Set(
        (await tx.branch.findMany({ select: { id: true } })).map((b) => b.id),
      );
      if (prepared.some((p) => !branches.has(p.branchId)))
        throw new AppError("Chi nhánh vừa thay đổi. Hãy xem trước lại.");
      const existing = await tx.user.count({
        where: { employeeCode: { in: rows.map((r) => r.employeeCode) } },
      });
      if (existing)
        throw new AppError("Một số mã NV đã được tạo. Hãy xem trước lại file.");
      await tx.user.createMany({ data: prepared });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "Nhập nhân sự",
          details: `${rows.length} nhân sự`,
        },
      });
    });
    refresh();
    return {
      success: true,
      message: `Đã nhập ${rows.length} nhân sự. Tải mật khẩu tạm trước khi rời trang.`,
      credentials,
    };
  } catch (error) {
    return { message: actionMessage(error) };
  }
}

export async function previewBank(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size > 2 * 1024 * 1024)
    return { message: "Chọn file JSON không quá 2 MB." };
  try {
    const data = bankSchema.parse(JSON.parse(await file.text()));
    const ids = data.topics.flatMap((t) => t.questions.map((q) => q.id));
    const updated = await db.question.count({ where: { id: { in: ids } } });
    return {
      payload: JSON.stringify(data),
      preview: {
        total: ids.length,
        valid: ids.length,
        added: ids.length - updated,
        updated,
        errors: [],
      },
      message:
        "Chưa nhập. Câu trùng mã sẽ được cập nhật; bài làm cũ vẫn giữ nguyên.",
    };
  } catch {
    return {
      message:
        "JSON không đúng định dạng questions.json. Kiểm tra các chủ đề, mã câu, 4 đáp án và correct_index.",
    };
  }
}

export async function importBank(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();
  const payload = z
    .string()
    .max(2 * 1024 * 1024)
    .safeParse(form.get("payload"));
  if (!payload.success)
    return { message: "Dữ liệu nhập quá lớn hoặc không hợp lệ." };
  try {
    const data = bankSchema.parse(JSON.parse(payload.data));
    await atomic(async (tx) => {
      for (const t of data.topics) {
        await tx.topic.upsert({
          where: { id: t.id },
          create: {
            id: t.id,
            code: t.code,
            title: t.title,
            part: t.part,
            sort: t.sort,
          },
          update: { code: t.code, title: t.title, part: t.part, sort: t.sort },
        });
      }
      // One parameterized statement avoids hundreds of network round trips.
      const values = data.topics.flatMap((t) =>
        t.questions.map(
          (q) =>
            Prisma.sql`(${q.id}, ${t.id}, ${q.text}, ARRAY[${Prisma.join(q.options)}]::text[], ${q.correct_index}, ${q.explanation}, NOW())`,
        ),
      );
      if (values.length)
        await tx.$executeRaw(Prisma.sql`
        INSERT INTO "Question" ("id", "topicId", "text", "options", "correctIndex", "explanation", "updatedAt")
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("id") DO UPDATE SET
          "topicId" = EXCLUDED."topicId", "text" = EXCLUDED."text", "options" = EXCLUDED."options",
          "correctIndex" = EXCLUDED."correctIndex", "explanation" = EXCLUDED."explanation", "updatedAt" = EXCLUDED."updatedAt"
      `);
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "Nhập ngân hàng câu hỏi",
          details: `${data.topics.length} chủ đề · ${data.topics.reduce((s, t) => s + t.questions.length, 0)} câu`,
        },
      });
    });
    refresh();
    return { success: true, message: "Đã nhập ngân hàng câu hỏi." };
  } catch (error) {
    return { message: actionMessage(error) };
  }
}
