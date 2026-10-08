"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    // Only the digest is safe to surface; the server log holds the details.
    console.error(error);
  }, [error]);

  return (
    <section
      role="alert"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center"
    >
      <h1 className="text-xl font-semibold">Đã có lỗi xảy ra</h1>
      <p className="text-sm text-muted-foreground">
        Không thể hiển thị nội dung này. Vui lòng thử lại sau ít phút.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Mã lỗi: {error.digest}
        </p>
      ) : null}
      <Button onClick={() => retry()}>Thử lại</Button>
    </section>
  );
}
