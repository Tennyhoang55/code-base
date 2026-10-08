"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logout } from "../actions";

export function EndParticipantSession() {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="logout"
        onClick={() => setConfirm(true)}
      >
        Đổi người làm bài
      </Button>
      {confirm && (
        <section className="notice warning" aria-label="Đổi người làm bài">
          <p>
            Đổi người sẽ kết thúc phiên hiện tại. Bạn sẽ không mở lại lịch sử
            này trên trình duyệt; quản trị vẫn giữ kết quả. Tiếp tục?
          </p>
          <div className="row">
            <form action={logout}>
              <Button type="submit" className="action-primary">
                Xác nhận đổi người
              </Button>
            </form>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirm(false)}
            >
              Giữ phiên hiện tại
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
