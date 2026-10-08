import { Trophy } from "lucide-react";
import { FilterFields } from "@/components/shared/filters";
import { requireUser } from "@/features/auth/session";
import {
  filters,
  getLeaderboard,
  type Search,
} from "@/features/training/queries";
import { AppError } from "@/lib/errors";
import { formatDuration, percentage } from "@/lib/format";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const f = filters(search);
  const user = await requireUser();
  let data: Awaited<ReturnType<typeof getLeaderboard>>;
  try {
    data = await getLeaderboard(search);
  } catch (error) {
    if (error instanceof AppError)
      return (
        <div className="wrap page">
          <p className="notice">{error.message}</p>
        </div>
      );
    throw error;
  }
  const overall = !f.topic || f.topic === "all";
  return (
    <div className="wrap page">
      <div className="section-heading">
        <div>
          <p className="kicker">CÙNG NHAU TIẾN BỘ</p>
          <h2>Bảng xếp hạng</h2>
        </div>
        <Trophy className="heading-icon" />
      </div>
      <section className="panel">
        <form
          className="filter-grid"
          key={JSON.stringify(f)}
          action="/xep-hang"
        >
          <label>
            Xếp hạng theo
            <select name="topic" defaultValue={f.topic || "all"}>
              <option value="all">Tổng điểm</option>
              <option value="mixed">Thi tổng hợp</option>
              {data.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} · {t.title}
                </option>
              ))}
            </select>
          </label>
          <FilterFields branches={data.branches} values={f} />
          <button className="btn primary" type="submit">
            Áp dụng bộ lọc
          </button>
        </form>
        <p className="note">
          {overall
            ? `Tối đa ${data.maximum} điểm. Chỉ tính lần tốt nhất từng chủ đề; không cộng bài tổng hợp.`
            : "Mỗi người tính lượt tốt nhất. Cùng điểm thì người làm nhanh hơn, sau đó người đạt kết quả sớm hơn đứng trên."}
        </p>
        <div className="table-frame">
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Họ tên</th>
                <th>Chi nhánh</th>
                {overall ? (
                  <>
                    <th>Tổng điểm</th>
                    <th>Đã làm</th>
                    <th>Chủ đề đạt</th>
                  </>
                ) : (
                  <>
                    <th>Điểm</th>
                    <th>%</th>
                    <th>Thời gian</th>
                    <th>Số lần</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={row.id} className={row.id === user.id ? "me" : ""}>
                  <td>
                    <span className={`rank rank-${i + 1}`}>{i + 1}</span>
                  </td>
                  <td className="name-cell">
                    {row.name}
                    {row.id === user.id && <small> (bạn)</small>}
                  </td>
                  <td>{row.branch}</td>
                  {overall ? (
                    <>
                      <td className="numeric">
                        {row.sum}/{data.maximum}
                      </td>
                      <td>
                        {row.done}/{data.topics.length}
                      </td>
                      <td>{row.passed}</td>
                    </>
                  ) : (
                    <>
                      <td>
                        {row.best?.score}/{row.best?.total}
                      </td>
                      <td>{percentage(row.best?.percentage ?? 0)}</td>
                      <td className="numeric">
                        {formatDuration(row.best?.durationSeconds ?? 0)}
                      </td>
                      <td>{row.attempts}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!data.rows.length && (
            <p className="empty">
              Chưa có kết quả trong bộ lọc này. Hãy hoàn thành bài đầu tiên!
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
