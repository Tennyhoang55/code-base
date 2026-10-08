import Link from "next/link";
import { resetPassword } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/action-form";
import { EmployeeEditor } from "@/features/admin/components/editors";
import { getAdminCatalog, getEmployee } from "@/features/admin/queries";
import { formatDate, formatDuration, percentage } from "@/lib/format";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, user] = await Promise.all([getAdminCatalog(), getEmployee(id)]);
  return (
    <>
      <h2>{user.name}</h2>
      <p className="note">
        {user.employeeCode} · Lần đăng nhập gần nhất:{" "}
        {formatDate(user.lastLoginAt)}
      </p>
      {user.identityType === "PARTICIPANT" && (
        <p className="note">
          Hồ sơ tự khai báo, không sử dụng mật khẩu. Mỗi trình duyệt có phiên
          làm bài riêng.
        </p>
      )}
      <section className="panel">
        <EmployeeEditor branches={data.branches} user={user} />
        {user.identityType === "ACCOUNT" && (
          <details className="editor-details">
            <summary>Đặt lại mật khẩu</summary>
            <p className="note">
              Kết thúc mọi phiên của nhân sự. Nhân sự phải đổi mật khẩu tạm khi
              đăng nhập lại.
            </p>
            <ActionForm action={resetPassword} label="Tạo mật khẩu tạm">
              <input type="hidden" name="id" value={user.id} />
            </ActionForm>
          </details>
        )}
      </section>
      <section className="panel">
        <h3>Điểm tốt nhất từng chủ đề</h3>
        <div className="table-frame">
          <table>
            <thead>
              <tr>
                <th>Chủ đề</th>
                <th>Điểm</th>
                <th>%</th>
                <th>Số lần</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...data.topics.map((t) => ({ id: t.id, title: t.title })),
                { id: "mixed", title: "Thi tổng hợp" },
              ].map((t) => (
                <tr key={t.id}>
                  <td className="name-cell">{t.title}</td>
                  <td>
                    {user.best[t.id]
                      ? `${user.best[t.id].score}/${user.best[t.id].total}`
                      : "Chưa làm"}
                  </td>
                  <td>
                    {user.best[t.id]
                      ? percentage(user.best[t.id].percentage)
                      : "—"}
                  </td>
                  <td>
                    {
                      user.attempts.filter(
                        (a) => (a.topicId ?? "mixed") === t.id,
                      ).length
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h3>Lịch sử bài làm</h3>
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
              {user.attempts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/ket-qua/${a.id}`}>
                      {formatDate(a.submittedAt)}
                    </Link>
                  </td>
                  <td className="name-cell">{a.title}</td>
                  <td>
                    {a.score}/{a.total}
                  </td>
                  <td>{percentage(a.percentage)}</td>
                  <td>{formatDuration(a.durationSeconds)}</td>
                  <td>{a.passed ? "Đạt" : "Chưa đạt"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!user.attempts.length && (
            <p className="empty">Nhân sự chưa có bài đã nộp.</p>
          )}
        </div>
      </section>
    </>
  );
}
