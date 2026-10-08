import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/features/auth/session";
export default async function Layout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const tabs = [
    { path: "", label: "Tổng quan" },
    { path: "/nhan-su", label: "Nhân sự" },
    { path: "/tien-do", label: "Tiến độ" },
    { path: "/ket-qua", label: "Kết quả" },
    { path: "/cau-hoi", label: "Câu hỏi" },
    { path: "/cau-hinh", label: "Cấu hình" },
    { path: "/bao-cao", label: "Báo cáo" },
    { path: "/nhat-ky", label: "Nhật ký" },
  ];
  return (
    <div className="wrap page admin-container">
      <p className="kicker">QUẢN TRỊ ĐÀO TẠO</p>
      <nav className="admin-tabs" aria-label="Các mục quản trị">
        {tabs.map((t) => (
          <Link prefetch={false} href={`/quan-tri${t.path}`} key={t.path}>
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
