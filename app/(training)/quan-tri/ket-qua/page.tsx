import Link from "next/link";
import { FilterFields } from "@/components/shared/filters";
import {
  getAdminCatalog,
  getEmployees,
  getResults,
} from "@/features/admin/queries";
import { filters, type Search } from "@/features/training/queries";
import { formatDate, formatDuration, percentage } from "@/lib/format";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const f = filters(search);
  const [data, users, results] = await Promise.all([
    getAdminCatalog(),
    getEmployees(),
    getResults(search),
  ]);
  const params = new URLSearchParams({ ...f, kind: "attempts" });
  return (
    <>
      <h2>Kết quả bài làm</h2>
      <section className="panel">
        <form className="filter-grid" key={JSON.stringify(f)}>
          <FilterFields
            branches={data.branches}
            topics={data.topics}
            values={f}
          />
          <label>
            Nhân sự
            <select name="user" defaultValue={f.user}>
              <option value="">Tất cả</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.employeeCode} · {u.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kết quả
            <select name="passed" defaultValue={f.passed}>
              <option value="">Tất cả</option>
              <option value="yes">Đạt</option>
              <option value="no">Chưa đạt</option>
            </select>
          </label>
          <button type="submit" className="btn primary">
            Áp dụng bộ lọc
          </button>
        </form>
        <a className="btn" href={`/quan-tri/xuat?${params}`}>
          Xuất Excel theo bộ lọc
        </a>
        <div className="table-frame" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Ngày giờ</th>
                <th>Nhân sự</th>
                <th>Chi nhánh</th>
                <th>Chủ đề</th>
                <th>Điểm</th>
                <th>%</th>
                <th>Thời gian</th>
                <th>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {results.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/ket-qua/${a.id}`}>
                      {formatDate(a.submittedAt)}
                    </Link>
                  </td>
                  <td>{a.user.name}</td>
                  <td>{a.user.branch.name}</td>
                  <td className="name-cell">{a.title}</td>
                  <td>
                    {a.score}/{a.total}
                  </td>
                  <td>{percentage(a.percentage)}</td>
                  <td>{formatDuration(a.durationSeconds)}</td>
                  <td>
                    <span className={`chip ${a.passed ? "pass" : "fail"}`}>
                      {a.passed ? "Đạt" : "Chưa đạt"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!results.length && (
            <p className="empty">Không có bài làm phù hợp.</p>
          )}
        </div>
      </section>
    </>
  );
}
