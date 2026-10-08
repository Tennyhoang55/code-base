import { z } from "zod";

export const departmentSchema = z.enum(["Sales", "CS", "OPS", "Thực tập sinh"]);
export function todayInVietnam() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}
export const birthDateSchema = z.iso
  .date({ error: "Ngày sinh không hợp lệ." })
  .refine(
    (value) => value >= "1900-01-01" && value <= todayInVietnam(),
    "Ngày sinh phải từ năm 1900 đến hôm nay.",
  );
export const participantSchema = z.object({
  name: z.string().trim().min(2, "Vui lòng nhập họ tên.").max(150),
  birthDate: z
    .string()
    .trim()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Nhập ngày sinh theo dạng dd/mm/yyyy.")
    .transform((value) => {
      const [day, month, year] = value.split("/");
      return `${year}-${month}-${day}`;
    })
    .pipe(birthDateSchema),
  department: departmentSchema,
  branchId: z.string().min(1, "Vui lòng chọn chi nhánh.").max(100),
});
