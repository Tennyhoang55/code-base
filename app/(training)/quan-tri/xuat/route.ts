import { z } from "zod";
import { exportBank } from "@/features/admin/queries";
import { makeReport } from "@/features/admin/reports";
import { requireAdmin } from "@/features/auth/session";
export async function GET(request: Request) {
  await requireAdmin();
  const search = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = z
    .enum([
      "template",
      "summary",
      "progress",
      "attempts",
      "questions",
      "bank-json",
      "bank-excel",
    ])
    .safeParse(search.kind);
  if (!parsed.success)
    return new Response("Loại báo cáo không hợp lệ.", { status: 400 });
  const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
  const json = parsed.data === "bank-json";
  const content = json
    ? JSON.stringify(await exportBank(), null, 2)
    : await makeReport(parsed.data, search);
  return new Response(content, {
    headers: {
      "Content-Type": json
        ? "application/json; charset=utf-8"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sunway-${parsed.data}-${stamp}.${json ? "json" : "xlsx"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
