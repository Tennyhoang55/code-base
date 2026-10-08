import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap page">
      <section className="panel">
        <h2>Không tìm thấy trang</h2>
        <p>Trang hoặc bài làm không tồn tại, hoặc bạn không có quyền xem.</p>
        <Link className="btn primary" href="/">
          Về trang chủ
        </Link>
      </section>
    </div>
  );
}
