"use client";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { beginQuiz } from "../actions";

export function StartButton({
  topicId,
  hasActive = false,
  disabled = false,
  children,
  className,
}: {
  topicId: string | null;
  hasActive?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  function begin(replace: boolean) {
    start(async () => {
      try {
        const reply = await beginQuiz({ topicId, replace });
        if (reply.ok && reply.attemptId)
          router.push(`/lam-bai/${reply.attemptId}`);
        else {
          setError(reply.message ?? "Không thể bắt đầu.");
          setConfirm(false);
        }
      } catch {
        setError("Mất kết nối. Vui lòng thử lại.");
      }
    });
  }
  return (
    <>
      <button
        type="button"
        className={className ?? "btn primary"}
        disabled={disabled || pending}
        onClick={() => (hasActive ? setConfirm(true) : begin(false))}
      >
        {children}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>Bắt đầu bài mới?</DialogTitle>
          <DialogDescription>
            Bạn còn một bài đang làm. Bài đó sẽ bị hủy và không tính điểm nếu
            bắt đầu bài mới.
          </DialogDescription>
          <div className="row">
            <Button
              className="action-primary"
              disabled={pending}
              onClick={() => begin(true)}
            >
              Hủy bài cũ và bắt đầu
            </Button>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Quay lại
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
