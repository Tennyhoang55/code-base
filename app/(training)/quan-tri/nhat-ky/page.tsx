import { getAudit } from "@/features/admin/queries";
import { formatDate } from "@/lib/format";
export default async function Page() {
  const logs = await getAudit();
  return (
    <>
      <h2>Nhật ký hoạt động</h2>
      <section className="panel">
        <p className="note">
          500 hoạt động gần nhất. Nhật ký không lưu mật khẩu, token hoặc chuỗi
          kết nối.
        </p>
        <div className="table-frame">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Hoạt động</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>
                    {log.actor
                      ? `${log.actor.name} (${log.actor.employeeCode})`
                      : "Hệ thống"}
                  </td>
                  <td>{log.action}</td>
                  <td className="name-cell">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length && <p className="empty">Chưa có hoạt động.</p>}
        </div>
      </section>
    </>
  );
}
