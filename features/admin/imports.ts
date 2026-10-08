import "server-only";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { type EmployeeInput, employeeSchema } from "./schemas";

const csvRowsSchema = z.array(z.array(z.string()));

export async function readEmployees(file: File) {
  if (!file.size || file.size > 2 * 1024 * 1024)
    throw new AppError("Chọn file Excel/CSV không quá 2 MB.");
  let rows: string[][];
  if (file.name.toLowerCase().endsWith(".csv")) {
    const contents = await file.text();
    try {
      rows = csvRowsSchema.parse(
        parse(contents, {
          bom: true,
          skip_empty_lines: true,
          relax_column_count: true,
          delimiter: contents.split("\n")[0]?.includes(";") ? ";" : ",",
        }),
      );
    } catch {
      throw new AppError("CSV không hợp lệ. Hãy dùng file mẫu UTF-8.");
    }
  } else if (file.name.toLowerCase().endsWith(".xlsx")) {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(await file.arrayBuffer());
    } catch {
      throw new AppError(
        "File Excel không đọc được. Hãy dùng định dạng .xlsx.",
      );
    }
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount > 1001)
      throw new AppError("Mỗi lần nhập tối đa 1.000 dòng.");
    rows = [];
    sheet.eachRow((row) => {
      rows.push([1, 2, 3, 4].map((col) => row.getCell(col).text.trim()));
    });
  } else throw new AppError("Chỉ hỗ trợ file .xlsx hoặc .csv.");
  if (!rows.length || rows.length > 1001)
    throw new AppError("File trống hoặc vượt 1.000 dòng.");
  const headers = rows[0].map((value) => value.trim().toLowerCase());
  if (
    headers[0] !== "mã nv" ||
    headers[1] !== "họ tên" ||
    headers[2] !== "chi nhánh" ||
    headers[3] !== "email"
  )
    throw new AppError(
      "Cột phải theo thứ tự: Mã NV, Họ tên, Chi nhánh, Email. Hãy tải file mẫu.",
    );
  const [branches, users] = await Promise.all([
    db.branch.findMany({ select: { id: true, name: true } }),
    db.user.findMany({ select: { employeeCode: true } }),
  ]);
  const existing = new Set(users.map((u) => u.employeeCode));
  const seen = new Set<string>();
  const valid: EmployeeInput[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((row, index) => {
    const branch = branches.find(
      (b) =>
        b.name.toLocaleLowerCase("vi") ===
        (row[2] ?? "").trim().toLocaleLowerCase("vi"),
    );
    const result = employeeSchema.safeParse({
      employeeCode: row[0] ?? "",
      name: row[1] ?? "",
      branchId: branch?.id ?? "",
      email: row[3] ?? "",
    });
    if (!result.success) {
      errors.push(
        `Dòng ${index + 2}: ${result.error.issues.map((i) => i.message).join(", ")}${!branch ? " (chi nhánh không tồn tại)" : ""}`,
      );
      return;
    }
    if (
      existing.has(result.data.employeeCode) ||
      seen.has(result.data.employeeCode)
    ) {
      errors.push(`Dòng ${index + 2}: trùng mã ${result.data.employeeCode}`);
      return;
    }
    seen.add(result.data.employeeCode);
    valid.push(result.data);
  });
  return { rows: valid, total: rows.length - 1, errors };
}
