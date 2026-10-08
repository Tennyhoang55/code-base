import { AuthForm } from "@/features/auth/components/auth-form";
import { requireUser } from "@/features/auth/session";
import { formatBirthDate } from "@/lib/format";
export default async function Page() {
  const user = await requireUser(true);
  if (user.identityType === "PARTICIPANT")
    return (
      <div className="wrap page">
        <section className="panel auth-panel">
          <p className="kicker">HỒ SƠ TỰ KHAI BÁO</p>
          <h2>Thông tin người làm bài</h2>
          <dl className="form-stack">
            <div>
              <dt>Họ và tên</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Ngày sinh</dt>
              <dd>{formatBirthDate(user.birthDate)}</dd>
            </div>
            <div>
              <dt>Phòng ban</dt>
              <dd>{user.department}</dd>
            </div>
            <div>
              <dt>Chi nhánh</dt>
              <dd>{user.branch.name}</dd>
            </div>
          </dl>
          <p className="note">
            Hồ sơ này gắn với phiên trên trình duyệt. Nếu khai báo nhầm, hãy
            liên hệ quản trị để điều chỉnh; không cần đặt mật khẩu.
          </p>
        </section>
      </div>
    );
  return (
    <div className="wrap page">
      <section className="panel auth-panel">
        <p className="kicker">TÀI KHOẢN CỦA BẠN</p>
        <h2>
          {user.mustChangePassword ? "Đổi mật khẩu để bắt đầu" : "Đổi mật khẩu"}
        </h2>
        <p className="muted">
          {user.mustChangePassword
            ? "Đây là lần đăng nhập đầu tiên hoặc mật khẩu vừa được đặt lại. Bạn cần đặt mật khẩu riêng trước khi sử dụng."
            : "Sau khi đổi mật khẩu, các phiên đăng nhập khác sẽ kết thúc."}
        </p>
        <AuthForm passwordChange />
      </section>
    </div>
  );
}
