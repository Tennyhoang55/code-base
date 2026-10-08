import Link from "next/link";
import { FilterFields } from "@/components/shared/filters";
import { getDashboard } from "@/features/admin/queries";
import { filters, type Search } from "@/features/training/queries";
import { percentage } from "@/lib/format";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const f = filters(search);
  const data = await getDashboard(search);
  return (
    <>
      <h2>Tổng quan đào tạo</h2>
      <section className="panel">
        <form className="filter-grid" key={JSON.stringify(f)}>
          <FilterFields branches={data.branches} values={f} />
          <button className="btn primary" type="submit">
            Lọc tổng quan
          </button>
        </form>
      </section>
      <div className="stats dashboard-stats">
        <div className="stat">
          <b>{data.staff}</b>
          <span>Tổng số nhân sự</span>
        </div>
        <div className="stat">
          <b>{data.done}</b>
          <span>Đã làm ít nhất 1 bài</span>
        </div>
        <div className="stat">
          <b>{data.monthly}</b>
          <span>Lượt làm trong tháng</span>
        </div>
        <div className="stat">
          <b>{percentage(data.rate)}</b>
          <span>Tỷ lệ đạt chung</span>
        </div>
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <h3>Tỷ lệ đạt theo chủ đề</h3>
          <p className="note">Tỷ lệ lượt đạt trong khoảng thời gian đã chọn.</p>
          <div className="chart-list">
            {data.charts.map((t) => (
              <div
                className="chart-row"
                key={t.id}
                title={`${t.title} · ${t.total} lượt`}
              >
                <span>{t.code}</span>
                <div
                  className="chart-track"
                  role="img"
                  aria-label={`${t.title}: ${percentage(t.rate)}, ${t.total} lượt`}
                >
                  <div className="chart-fill" style={{ width: `${t.rate}%` }} />
                </div>
                <span>{percentage(t.rate)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h3>Nhân sự chưa làm bài</h3>
          <p className="note">Theo chi nhánh và khoảng thời gian đã chọn.</p>
          {data.absent.length ? (
            <div className="audit-list">
              {data.absent.map((u) => (
                <div className="audit-row" key={u.id}>
                  <Link href={`/quan-tri/nhan-su/${u.id}`}>{u.name}</Link>
                  <p>
                    {u.employeeCode} · {u.branch.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">Tất cả nhân sự đã tham gia.</p>
          )}
        </section>
      </div>
      <section className="panel">
        <h3>10 câu trả lời sai nhiều nhất</h3>
        <div className="table-frame">
          <table>
            <thead>
              <tr>
                <th>Câu hỏi</th>
                <th>Chủ đề</th>
                <th>Lượt</th>
                <th>Tỷ lệ sai</th>
              </tr>
            </thead>
            <tbody>
              {data.wrong.map((q) => (
                <tr key={q.id}>
                  <td className="name-cell">{q.text}</td>
                  <td>{q.topic.code}</td>
                  <td>{q.count}</td>
                  <td>{percentage(100 - q.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.wrong.length && (
            <p className="empty">Chưa có dữ liệu bài đã nộp.</p>
          )}
        </div>
      </section>
    </>
  );
}
