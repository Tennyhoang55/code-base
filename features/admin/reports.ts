import "server-only";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/features/auth/session";
import { getAdminRanking, type Search } from "@/features/training/queries";
import { formatBirthDate, formatDate, formatDuration } from "@/lib/format";
import { getProgress, getQuestionStats, getResults } from "./queries";

export async function makeReport(kind: string, search: Search) {
  await requireAdmin();
  let headers: string[] = [];
  let rows: (string | number)[][] = [];
  let progressPasses: (boolean | undefined)[][] = [];
  if (kind === "template") {
    headers = ["Mã NV", "Họ tên", "Chi nhánh", "Email"];
    rows = [["NV001", "Nguyễn Văn A", "Hà Nội", ""]];
  } else if (kind === "progress" || kind === "summary") {
    const data = await getProgress(search);
    if (kind === "progress") {
      const columns = [
        ...data.topics.map((t) => ({
          id: t.id,
          label: `${t.code} · ${t.title}`,
        })),
        { id: "mixed", label: "Thi tổng hợp" },
      ];
      headers = [
        "Mã hồ sơ",
        "Họ tên",
        "Ngày sinh",
        "Phòng ban",
        "Chi nhánh",
        ...columns.map((c) => c.label),
        "Tổng điểm",
        "Chủ đề đạt",
      ];
      rows = data.rows.map((u) => [
        u.employeeCode,
        u.name,
        formatBirthDate(u.birthDate),
        u.department ?? "—",
        u.branch.name,
        ...columns.map((c) =>
          u.best[c.id]
            ? Math.round(u.best[c.id].percentage * 10) / 10
            : "Chưa làm",
        ),
        u.sum,
        u.passed,
      ]);
      progressPasses = data.rows.map((u) =>
        columns.map((c) => u.best[c.id]?.passed),
      );
    } else {
      const board = await getAdminRanking(search);
      headers = [
        "Mã hồ sơ",
        "Họ tên",
        "Ngày sinh",
        "Phòng ban",
        "Chi nhánh",
        "Chủ đề đã làm",
        "Chủ đề đạt",
        "Tổng điểm",
        "Điểm tối đa",
        "Hạng",
      ];
      rows = data.rows.map((u) => [
        u.employeeCode,
        u.name,
        formatBirthDate(u.birthDate),
        u.department ?? "—",
        u.branch.name,
        u.done,
        u.passed,
        u.sum,
        data.maximum,
        board.rows.some((r) => r.id === u.id)
          ? board.rows.findIndex((r) => r.id === u.id) + 1
          : "—",
      ]);
    }
  } else if (kind === "attempts") {
    headers = [
      "Ngày giờ",
      "Mã NV",
      "Họ tên",
      "Ngày sinh",
      "Phòng ban",
      "Chi nhánh",
      "Chủ đề",
      "Điểm",
      "Tổng câu",
      "%",
      "Thời gian",
      "Kết quả",
      "Ngưỡng đạt",
    ];
    rows = (await getResults(search)).map((a) => [
      formatDate(a.submittedAt),
      a.user.employeeCode,
      a.user.name,
      formatBirthDate(a.user.birthDate),
      a.user.department ?? "—",
      a.user.branch.name,
      a.title,
      a.score,
      a.total,
      Math.round(a.percentage * 10) / 10,
      formatDuration(a.durationSeconds),
      a.passed ? "Đạt" : "Chưa đạt",
      a.passThreshold,
    ]);
  } else {
    const questions = await getQuestionStats(search);
    if (kind === "bank-excel") {
      headers = [
        "Mã câu",
        "Chủ đề",
        "Nội dung",
        "Đáp án A",
        "Đáp án B",
        "Đáp án C",
        "Đáp án D",
        "Đáp án đúng",
        "Giải thích",
        "Trạng thái",
      ];
      rows = questions.map((q) => [
        q.id,
        q.topic.title,
        q.text,
        ...q.options,
        String.fromCharCode(65 + q.correctIndex),
        q.explanation,
        q.isActive ? "Bật" : "Ẩn",
      ]);
    } else {
      headers = [
        "Mã câu",
        "Chủ đề",
        "Nội dung",
        "Lượt trả lời",
        "Trả lời đúng",
        "Tỷ lệ đúng (%)",
        "Trạng thái",
      ];
      rows = questions.map((q) => [
        q.id,
        q.topic.title,
        q.text,
        q.count,
        q.correct,
        Math.round(q.rate * 10) / 10,
        q.isActive ? "Bật" : "Ẩn",
      ]);
    }
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sunway Logistics";
  const sheet = workbook.addWorksheet("Sunway Quiz", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.addRow(headers);
  sheet.addRows(rows);
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: headers.length },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).height = 30;
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF11305A" },
  };
  sheet.columns.forEach((col, index) => {
    col.width =
      index === 1 ? 28 : Math.min(44, Math.max(16, headers[index].length + 3));
    col.alignment = { vertical: "middle", wrapText: true };
  });
  if (kind === "progress")
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell, col) => {
        if (col < 6 || col > headers.length - 2) return;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb:
              progressPasses[rowNumber - 2]?.[col - 6] !== undefined
                ? progressPasses[rowNumber - 2]?.[col - 6]
                  ? "FFE3F3EA"
                  : "FFFCE8E6"
                : "FFE9EDF2",
          },
        };
      });
    });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
