"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, login } from "../actions";

export function AuthForm({
  passwordChange = false,
}: {
  passwordChange?: boolean;
}) {
  const [state, action, pending] = useActionState(
    passwordChange ? changePassword : login,
    {},
  );
  const fields = passwordChange
    ? [
        {
          name: "currentPassword",
          label: "Mật khẩu hiện tại",
          complete: "current-password",
        },
        { name: "password", label: "Mật khẩu mới", complete: "new-password" },
        {
          name: "confirm",
          label: "Nhập lại mật khẩu mới",
          complete: "new-password",
        },
      ]
    : [
        { name: "employeeCode", label: "Mã nhân viên", complete: "username" },
        { name: "password", label: "Mật khẩu", complete: "current-password" },
      ];
  return (
    <form action={action} className="form-stack">
      {fields.map((field) => (
        <div key={field.name}>
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            name={field.name}
            type={field.name === "employeeCode" ? "text" : "password"}
            autoComplete={field.complete}
            required
            maxLength={field.name === "employeeCode" ? 40 : 128}
            minLength={
              passwordChange && field.name !== "currentPassword" ? 8 : 1
            }
            aria-invalid={!!state.errors?.[field.name]}
            aria-describedby={
              state.errors?.[field.name] ? `${field.name}-error` : undefined
            }
          />
          {state.errors?.[field.name] && (
            <p className="error" id={`${field.name}-error`}>
              {state.errors[field.name].join(" ")}
            </p>
          )}
        </div>
      ))}
      {state.message && (
        <p role="alert" className="error notice">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="action-primary">
        {pending
          ? "Đang xử lý…"
          : passwordChange
            ? "Lưu mật khẩu mới"
            : "Đăng nhập"}
      </Button>
    </form>
  );
}
