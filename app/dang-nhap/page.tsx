import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Loading } from "@/components/shared/loading";
import { AuthForm } from "@/features/auth/components/auth-form";
import { ParticipantForm } from "@/features/auth/components/participant-form";
import { getEntryBranches } from "@/features/auth/queries";
import { currentUser } from "@/features/auth/session";
import type { Search } from "@/features/training/queries";

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const admin =
    z.enum(["admin", "participant"]).catch("participant").parse(search.mode) ===
    "admin";
  const user = await currentUser();
  if (user && (!admin || user.role === "ADMIN"))
    redirect(user.mustChangePassword ? "/tai-khoan" : "/");
  if (!admin) {
    const branches = await getEntryBranches();
    return (
      <div className="wrap page">
        <section className="panel auth-panel">
          <p className="kicker">CHÀO MỪNG ĐẾN SUNWAY</p>
          <h2>Đánh giá kiến thức đầu vào</h2>
          <p className="muted">
            Dành cho nhân sự mới và thực tập sinh. Khai báo thông tin để bắt
            đầu; không cần tài khoản hay mật khẩu.
          </p>
          <ParticipantForm branches={branches} />
          <p className="note">
            Bạn có thể tiếp tục bài và xem lịch sử trên trình duyệt này. Dùng
            thiết bị mới, xóa dữ liệu trình duyệt hoặc đổi người làm bài sẽ tạo
            hồ sơ mới. Phiên được giữ tối đa 30 ngày.
          </p>
          <Link href="/dang-nhap?mode=admin" className="account-link">
            Đăng nhập quản trị
          </Link>
        </section>
      </div>
    );
  }
  return (
    <div className="wrap page">
      <section className="panel auth-panel">
        <p className="kicker">CHÀO MỪNG TRỞ LẠI</p>
        <h2>Đăng nhập quản trị</h2>
        <p className="muted">
          Dành cho quản lý đào tạo. Người làm bài chỉ cần khai báo thông tin.
        </p>
        <AuthForm />
        {user?.identityType === "PARTICIPANT" && (
          <p className="note">
            Đăng nhập quản trị sẽ kết thúc phiên người làm bài hiện tại trên
            trình duyệt này.
          </p>
        )}
        <Link href="/dang-nhap" className="account-link">
          Về form người làm bài
        </Link>
        <details className="forgot">
          <summary>Quên mật khẩu?</summary>
          <p>
            Liên hệ quản trị đào tạo tại chi nhánh để được cấp mật khẩu tạm. Hệ
            thống không mở đăng ký tự do.
          </p>
        </details>
        <p className="note">
          Sai mật khẩu 5 lần sẽ tạm khóa đăng nhập 15 phút. Phiên làm việc tự
          kết thúc sau 8 giờ không thao tác.
        </p>
      </section>
    </div>
  );
}
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
