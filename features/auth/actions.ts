"use server";

import "server-only";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, actionMessage } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";
import { atomic } from "@/lib/transaction";
import { participantSchema } from "./schemas";
import {
  createSession,
  currentUser,
  destroySession,
  requireUser,
} from "./session";

export type AuthState = { message?: string; errors?: Record<string, string[]> };

export async function enterAssessment(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  if (await currentUser()) redirect("/");
  const parsed = participantSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  let userId: string;
  try {
    userId = await atomic(async (tx) => {
      if (
        !(await tx.branch.findUnique({
          where: { id: parsed.data.branchId },
          select: { id: true },
        }))
      )
        throw new AppError(
          "Chi nhánh không tồn tại. Hãy tải lại trang rồi chọn lại.",
        );
      const user = await tx.user.create({
        data: {
          name: parsed.data.name,
          branchId: parsed.data.branchId,
          birthDate: new Date(`${parsed.data.birthDate}T00:00:00Z`),
          department: parsed.data.department,
          employeeCode: `HS-${randomUUID()}`,
          role: "EMPLOYEE",
          identityType: "PARTICIPANT",
          passwordHash: null,
          mustChangePassword: false,
          lastLoginAt: new Date(),
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "Khai báo làm bài",
          details: "Hồ sơ tự khai báo; phiên riêng trên trình duyệt",
        },
      });
      return user.id;
    });
    await createSession(userId);
  } catch (error) {
    return { message: actionMessage(error) };
  }
  redirect("/");
}
const loginSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .transform((value) => value.toUpperCase()),
  password: z.string().min(1).max(128),
});

export async function login(
  _state: AuthState,
  data: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success)
    return { message: "Vui lòng nhập mã nhân viên và mật khẩu hợp lệ." };
  const record = await db.user.findUnique({
    where: { employeeCode: parsed.data.employeeCode },
    select: { id: true, passwordHash: true },
  });
  // Use the same password KDF for unknown codes to avoid a fast username oracle.
  const dummy = `scrypt$00000000000000000000000000000000$${"0".repeat(128)}`;
  const valid = await verifyPassword(
    parsed.data.password,
    record?.passwordHash ?? dummy,
  );
  const result = await atomic(async (tx) => {
    if (!record) return { error: "Mã nhân viên hoặc mật khẩu không đúng." };
    const user = await tx.user.findUnique({
      where: { id: record.id },
      select: {
        id: true,
        employeeCode: true,
        passwordHash: true,
        role: true,
        identityType: true,
        isActive: true,
        lockedUntil: true,
        failedLoginAttempts: true,
        mustChangePassword: true,
      },
    });
    if (
      !user?.isActive ||
      user.role !== "ADMIN" ||
      user.identityType !== "ACCOUNT"
    )
      return {
        error:
          "Mã nhân viên hoặc mật khẩu không đúng. Nếu tài khoản bị khóa, hãy liên hệ quản trị.",
      };
    if (user.lockedUntil && user.lockedUntil > new Date())
      return {
        error:
          "Đăng nhập tạm khóa 15 phút do nhập sai 5 lần. Vui lòng thử lại sau.",
      };
    if (!valid || user.passwordHash !== record.passwordHash) {
      const failures = user.lockedUntil ? 1 : user.failedLoginAttempts + 1;
      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failures,
          lockedUntil: failures >= 5 ? new Date(Date.now() + 15 * 60000) : null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "Đăng nhập thất bại",
          details: failures >= 5 ? "Tạm khóa 15 phút" : "Mật khẩu không đúng",
        },
      });
      return {
        error:
          failures >= 5
            ? "Đăng nhập tạm khóa 15 phút do nhập sai 5 lần."
            : "Mã nhân viên hoặc mật khẩu không đúng.",
      };
    }
    await tx.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "Đăng nhập",
        details: user.employeeCode,
      },
    });
    return { userId: user.id, change: user.mustChangePassword };
  });
  if (result.error || !result.userId) return { message: result.error };
  await destroySession();
  await createSession(result.userId);
  redirect(result.change ? "/tai-khoan" : "/");
}

export async function logout() {
  await destroySession();
  redirect("/dang-nhap");
}

export async function changePassword(
  _state: AuthState,
  data: FormData,
): Promise<AuthState> {
  const user = await requireUser(true);
  if (user.role !== "ADMIN" || user.identityType !== "ACCOUNT")
    return { message: "Người làm bài không sử dụng mật khẩu." };
  const parsed = z
    .object({
      currentPassword: z.string().min(1).max(128),
      password: z.string().min(8, "Mật khẩu mới cần ít nhất 8 ký tự.").max(128),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      path: ["confirm"],
      message: "Hai mật khẩu mới chưa khớp.",
    })
    .refine((v) => v.currentPassword !== v.password, {
      path: ["password"],
      message: "Hãy chọn mật khẩu khác mật khẩu hiện tại.",
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      message: "Vui lòng kiểm tra lại các trường.",
    };
  const record = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (
    !(await verifyPassword(
      parsed.data.currentPassword,
      record.passwordHash ?? "",
    ))
  )
    return { message: "Mật khẩu hiện tại không đúng." };
  const passwordHash = await hashPassword(parsed.data.password);
  await atomic(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: user.id, passwordHash: record.passwordHash, isActive: true },
      data: {
        passwordHash,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    if (!updated.count)
      throw new Error("Tài khoản vừa thay đổi. Vui lòng đăng nhập lại.");
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "Đổi mật khẩu",
        details: user.employeeCode,
      },
    });
  });
  await createSession(user.id);
  redirect("/");
}
