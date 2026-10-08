import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-md font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Code Base
        </Link>
        <nav aria-label="Liên kết ngoài">
          <ul className="flex items-center gap-4 text-sm text-muted-foreground">
            <li>
              <a
                href="https://nextjs.org/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Next.js
              </a>
            </li>
            <li>
              <a
                href="https://www.prisma.io/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Prisma
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
