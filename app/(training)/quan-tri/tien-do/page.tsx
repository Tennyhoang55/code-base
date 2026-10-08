import Link from "next/link";
import { FilterFields } from "@/components/shared/filters";
import { getProgress } from "@/features/admin/queries";
import { filters, type Search } from "@/features/training/queries";
import { percentage } from "@/lib/format";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const f = filters(search);
  const data = await getProgress(search);
  const columns = [
    ...data.topics.map((t) => ({ id: t.id, code: t.code, title: t.title })),
    { id: "mixed", code: "TH", title: "Thi tổng hợp" },
  ];
  return (
    <>
      <h2>Ma trận tiến độ</h2>
      <section className="panel">
        <form className="row filter-form" key={JSON.stringify(f)}>
          <FilterFields branches={data.branches} date={false} values={f} />
          <button className="btn primary" type="submit">
            Lọc chi nhánh
          </button>
          <a
            className="btn"
            href={`/quan-tri/xuat?kind=progress&branch=${encodeURIComponent(f.branch)}`}
          >
            Xuất Excel
          </a>
        </form>
        <p className="note">
          Xanh: đạt · Đỏ: chưa đạt · Xám: chưa làm. Điểm tổng tính trên{" "}
          {data.maximum} câu đang bật.
        </p>
        <div className="table-frame">
          <table>
            <thead>
              <tr>
                <th>Nhân sự</th>
                {columns.map((t) => (
                  <th key={t.id} title={t.title}>
                    {t.code}
                  </th>
                ))}
                <th>Tổng điểm</th>
                <th>Chủ đề đạt</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((u) => (
                <tr key={u.id}>
                  <td className="name-cell">
                    <Link href={`/quan-tri/nhan-su/${u.id}`}>{u.name}</Link>
                    <br />
                    <small>
                      {u.employeeCode} · {u.branch.name}
                    </small>
                  </td>
                  {columns.map((t) => (
                    <td key={t.id} className="matrix-cell">
                      <span
                        className={`chip ${u.best[t.id] ? (u.best[t.id].passed ? "pass" : "fail") : "none"}`}
                      >
                        {u.best[t.id]
                          ? percentage(u.best[t.id].percentage)
                          : "—"}
                      </span>
                    </td>
                  ))}
                  <td>
                    {u.sum}/{data.maximum}
                  </td>
                  <td>
                    {u.passed}/{data.topics.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.rows.length && (
            <p className="empty">Chưa có nhân sự trong chi nhánh này.</p>
          )}
        </div>
      </section>
    </>
  );
}
