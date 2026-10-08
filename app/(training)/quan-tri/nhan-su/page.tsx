import Link from "next/link";
import { FilterFields } from "@/components/shared/filters";
import { saveBranch } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/action-form";
import { EmployeeEditor } from "@/features/admin/components/editors";
import { ImportPanel } from "@/features/admin/components/import-panel";
import { getAdminCatalog, getEmployees } from "@/features/admin/queries";
import { filters, type Search } from "@/features/training/queries";
import { formatBirthDate } from "@/lib/format";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const f = filters(search);
  const [data, staff] = await Promise.all([
    getAdminCatalog(),
    getEmployees(search),
  ]);
  return (
    <>
      <h2>Quản lý nhân sự</h2>
      <p className="note">
        Người làm bài tự khai báo họ tên, ngày sinh, phòng ban và chi nhánh.
        Không cần cấp tài khoản hay mật khẩu.
      </p>
      <section className="panel">
        <form className="filter-grid" key={JSON.stringify(f)}>
          <label>
            Tìm nhân sự
            <input
              name="q"
              placeholder="Tên hoặc mã nhân viên"
              defaultValue={f.q}
            />
          </label>
          <FilterFields branches={data.branches} date={false} values={f} />
          <label>
            Vai trò
            <select name="role" defaultValue={f.role}>
              <option value="">Tất cả</option>
              <option value="EMPLOYEE">Nhân sự</option>
              <option value="ADMIN">Quản trị</option>
            </select>
          </label>
          <label>
            Trạng thái
            <select name="active" defaultValue={f.active}>
              <option value="">Tất cả</option>
              <option value="yes">Hoạt động</option>
              <option value="no">Bị khóa</option>
            </select>
          </label>
          <button className="btn primary" type="submit">
            Tìm kiếm
          </button>
        </form>
        <div className="table-frame">
          <table>
            <thead>
              <tr>
                <th>Mã hồ sơ / tài khoản</th>
                <th>Họ tên</th>
                <th>Ngày sinh</th>
                <th>Phòng ban</th>
                <th>Chi nhánh</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id}>
                  <td>{u.employeeCode}</td>
                  <td className="name-cell">
                    <Link href={`/quan-tri/nhan-su/${u.id}`}>{u.name}</Link>
                  </td>
                  <td>{formatBirthDate(u.birthDate)}</td>
                  <td>{u.department ?? "—"}</td>
                  <td>{u.branch.name}</td>
                  <td>{u.role === "ADMIN" ? "Quản trị" : "Nhân sự"}</td>
                  <td>
                    <span className={`chip ${u.isActive ? "pass" : "fail"}`}>
                      {u.isActive ? "Hoạt động" : "Khóa"}
                    </span>
                  </td>
                  <td>
                    <Link href={`/quan-tri/nhan-su/${u.id}`}>Xem / sửa</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!staff.length && <p className="empty">Không có nhân sự phù hợp.</p>}
        </div>
      </section>
      <section className="panel">
        <details>
          <summary className="field-label">Thêm tài khoản quản trị</summary>
          <EmployeeEditor branches={data.branches} />
        </details>
      </section>
      <details className="panel">
        <summary className="field-label">
          Danh sách nhân sự cũ (CSV / Excel)
        </summary>
        <p className="note">
          Dùng để giữ danh sách theo mã nhân viên. Người làm bài vẫn khai báo
          trên trình duyệt; các hồ sơ tự khai báo không tự ghép với danh sách
          này.
        </p>
        <ImportPanel />
      </details>
      <section className="panel">
        <h3>Quản lý chi nhánh</h3>
        <div className="editor-grid">
          {data.branches.map((b) => (
            <ActionForm key={b.id} action={saveBranch} label="Đổi tên">
              <input name="id" type="hidden" value={b.id} />
              <label className="field-label">
                Chi nhánh
                <input name="name" defaultValue={b.name} required />
              </label>
            </ActionForm>
          ))}
          <ActionForm action={saveBranch} label="Thêm chi nhánh">
            <label className="field-label">
              Tên chi nhánh mới
              <input name="name" required placeholder="Tên chi nhánh" />
            </label>
          </ActionForm>
        </div>
      </section>
    </>
  );
}
