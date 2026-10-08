import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono, Lexend } from "next/font/google";
import { SiteHeader } from "@/components/shared/site-header";
import "./globals.css";

const geistSans = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const heading = Lexend({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: {
    default: "Sunway Quiz — Đào tạo Sales Freight Forwarder",
    template: "%s | Sunway Quiz",
  },
  description:
    "Hệ thống kiểm tra kiến thức và theo dõi đào tạo nội bộ Sunway Logistics.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} ${heading.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-3 focus:ring-ring/50"
        >
          Chuyển tới nội dung chính
        </a>
        <SiteHeader />
        <main id="main-content" className="flex flex-1 flex-col">
          {children}
        </main>
        <footer className="wrap site-footer">
          <strong>Sunway Logistics · Đào tạo nội bộ</strong>
          <p>
            Hệ thống lưu họ tên, ngày sinh, phòng ban, chi nhánh, kết quả bài
            làm và thông tin tài khoản quản trị để đánh giá kiến thức, phục vụ
            đào tạo nội bộ. Thông tin được phân quyền truy cập, xử lý theo quy
            định bảo vệ dữ liệu cá nhân.{" "}
            <a
              href="https://vanban.chinhphu.vn/?docid=214590&pageid=27160"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tham khảo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15.
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
