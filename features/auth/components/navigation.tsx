"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation({
  admin,
  board,
  restricted,
}: {
  admin: boolean;
  board: boolean;
  restricted: boolean;
}) {
  const pathname = usePathname();
  const links = restricted
    ? []
    : [
        { href: "/", label: "Làm bài" },
        ...(board || admin
          ? [{ href: "/xep-hang", label: "Bảng xếp hạng" }]
          : []),
        { href: "/lich-su", label: "Lịch sử của tôi" },
        ...(admin ? [{ href: "/quan-tri", label: "Quản trị" }] : []),
      ];
  return (
    <nav className="main-tabs" aria-label="Điều hướng chính">
      {links.map((link) => (
        <Link
          prefetch={false}
          key={link.href}
          href={link.href}
          aria-current={
            link.href === "/"
              ? pathname === "/"
                ? "page"
                : undefined
              : pathname.startsWith(link.href)
                ? "page"
                : undefined
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
