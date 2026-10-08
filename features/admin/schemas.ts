import { z } from "zod";

export const employeeSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1, "Thiếu mã NV")
    .max(40)
    .regex(/^[\p{L}\p{N}._-]+$/u, "Mã NV không được có khoảng trắng")
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2, "Thiếu họ tên").max(150),
  branchId: z.string().min(1, "Chọn chi nhánh"),
  email: z.union([z.email(), z.literal("")]).default(""),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type AdminState = {
  success?: boolean;
  message?: string;
  password?: string;
  employeeCode?: string;
  credentials?: { employeeCode: string; password: string }[];
  payload?: string;
  preview?: {
    total: number;
    valid: number;
    added?: number;
    updated?: number;
    errors: string[];
  };
};
