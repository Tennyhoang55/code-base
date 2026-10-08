import { Ship } from "lucide-react";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="brand-band">
      <div className="wrap">
        <div className="brand-row">
          <Link
            href="/"
            className="wordmark"
            aria-label="Sunway Logistics — Trang chủ"
          >
            <Ship size={30} aria-hidden="true" />
            <span>
              SUNWAY<small>LOGISTICS</small>
            </span>
          </Link>
          <span className="eyebrow">HỌC ĐỂ VƯƠN XA</span>
        </div>
        <div className="eyebrow">Đào tạo nội bộ · Cẩm nang 2026</div>
        <h1>
          Kiểm tra kiến thức
          <br />
          <span>Sales Freight Forwarder</span>
        </h1>
        <p className="brand-description">
          Vững kiến thức. Rèn kỹ năng. Cùng Sunway tiến xa hơn mỗi ngày.
        </p>
      </div>
    </header>
  );
}
