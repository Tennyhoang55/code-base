import { FilterFields } from "@/components/shared/filters";
import { getAdminCatalog } from "@/features/admin/queries";
import { filters, type Search } from "@/features/training/queries";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const f = filters(search);
  const data = await getAdminCatalog();
  const reports = [
    { kind: "summary", label: "Tổng hợp theo nhân sự" },
    { kind: "progress", label: "Ma trận tiến độ" },
    { kind: "attempts", label: "Toàn bộ bài làm" },
    { kind: "questions", label: "Thống kê câu hỏi" },
  ];
  return (
    <>
      <h2>Báo cáo đào tạo</h2>
      <section className="panel">
        <form className="filter-grid" key={JSON.stringify(f)}>
          <FilterFields branches={data.branches} values={f} />
          <button className="btn primary" type="submit">
            Áp dụng bộ lọc
          </button>
        </form>
        <p className="note">
          Các file Excel dùng bộ lọc chi nhánh và thời gian bên trên, ngày giờ
          Việt Nam. Tên file có ngày xuất.
        </p>
        <div className="report-links">
          {reports.map((r) => (
            <a
              key={r.kind}
              className="btn"
              href={`/quan-tri/xuat?${new URLSearchParams({ ...f, kind: r.kind })}`}
            >
              ↓ Xuất Excel · {r.label}
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
