import Link from "next/link";
import { filters, getHistory, type Search } from "@/features/training/queries";
import { formatDate, formatDuration, percentage } from "@/lib/format";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const data = await getHistory(search);
  const f = filters(search);
  return (
    <div className="wrap page">
      <p className="kicker">MỖI LƯỢT LÀM, MỘT BƯỚC TIẾN</p>
      <h2>Lịch sử của tôi</h2>
      <section className="panel">
        <form className="row filter-form" key={JSON.stringify(f)}>
          <label>
            Chủ đề
            <select name="topic" defaultValue={f.topic}>
              <option value="">Tất cả chủ đề</option>
              <option value="mixed">Thi tổng hợp</option>
              {data.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} · {t.title}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn">
            Lọc lịch sử
          </button>
        </form>
        <div className="table-frame">
          <table>
            <thead>
              <tr>
                <th>Ngày giờ</th>
                <th>Chủ đề</th>
                <th>Điểm</th>
                <th>%</th>
                <th>Thời gian</th>
                <th>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {data.attempts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/ket-qua/${a.id}`}>
                      {formatDate(a.submittedAt)}
                    </Link>
                  </td>
                  <td className="name-cell">
                    <Link href={`/ket-qua/${a.id}`}>{a.title}</Link>
                  </td>
                  <td>
                    {a.score}/{a.total}
                  </td>
                  <td>{percentage(a.percentage)}</td>
                  <td className="numeric">
                    {formatDuration(a.durationSeconds)}
                  </td>
                  <td>
                    <span className={`chip ${a.passed ? "pass" : "fail"}`}>
                      {a.passed ? "Đạt" : "Chưa đạt"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.attempts.length && (
            <p className="empty">
              Bạn chưa có bài đã nộp trong bộ lọc này.{" "}
              <Link href="/">Chọn chủ đề để bắt đầu.</Link>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
