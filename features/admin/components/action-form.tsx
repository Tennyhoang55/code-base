"use client";
import { type ReactNode, useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminState } from "../schemas";
export type AdminAction = (
  state: AdminState,
  data: FormData,
) => Promise<AdminState>;

export function ActionForm({
  action,
  children,
  label = "Lưu thay đổi",
  className,
}: {
  action: AdminAction;
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  const [hiddenPassword, setHiddenPassword] = useState("");
  return (
    <form action={submit} className={className ?? "form-stack"}>
      {children}
      <Button type="submit" className="action-primary" disabled={pending}>
        {pending ? "Đang lưu…" : label}
      </Button>
      {state.message && (
        <p
          role="status"
          className={`notice ${state.success ? "success" : "error"}`}
        >
          {state.message}
        </p>
      )}
      {state.password && hiddenPassword !== state.password && (
        <div className="secret">
          <strong>{state.employeeCode} · Mật khẩu tạm</strong>
          <code>{state.password}</code>
          <p className="note">
            Chỉ hiển thị trong lượt này. Gửi trực tiếp cho nhân sự, không đăng
            công khai.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setHiddenPassword(state.password ?? "")}
          >
            Đã nhận, ẩn mật khẩu
          </Button>
        </div>
      )}
    </form>
  );
}
