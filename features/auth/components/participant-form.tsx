"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { enterAssessment } from "../actions";
import { departmentSchema } from "../schemas";

export function ParticipantForm({
  branches,
}: {
  branches: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(enterAssessment, {});
  const [birthDate, setBirthDate] = useState("");
  return (
    <form action={action} className="form-stack">
      <label>
        Họ và tên
        <input
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={150}
          placeholder="Nhập đầy đủ họ tên"
        />
      </label>
      <label>
        Ngày sinh
        <input
          name="birthDate"
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          required
          placeholder="dd/mm/yyyy"
          pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
          maxLength={10}
          value={birthDate}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
            setBirthDate(
              [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
                .filter(Boolean)
                .join("/"),
            );
          }}
          aria-describedby="participant-birth-date-hint"
        />
        <small id="participant-birth-date-hint" className="note">
          Gõ ngày, tháng, năm. Ví dụ: 20/05/2001.
        </small>
      </label>
      <label>
        <span id="participant-department-label">Phòng ban</span>
        <select
          name="department"
          aria-labelledby="participant-department-label"
          defaultValue=""
          required
        >
          <option value="" disabled>
            Chọn phòng ban
          </option>
          {departmentSchema.options.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span id="participant-branch-label">Chi nhánh</span>
        <select
          name="branchId"
          aria-labelledby="participant-branch-label"
          defaultValue=""
          required
        >
          <option value="" disabled>
            Chọn chi nhánh
          </option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
      {state.message && (
        <p className="error notice" role="alert">
          {state.message}
        </p>
      )}
      <p className="note">
        Thông tin dùng để đánh giá kiến thức và theo dõi đào tạo nội bộ. Ngày
        sinh và phòng ban chỉ hiển thị trong hồ sơ của bạn và khu vực quản trị.
      </p>
      <Button
        type="submit"
        disabled={pending || !branches.length}
        className="action-primary"
      >
        {pending ? "Đang bắt đầu…" : "Vào làm bài"}
      </Button>
    </form>
  );
}
