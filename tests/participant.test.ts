import assert from "node:assert/strict";
import test from "node:test";
import { participantSchema } from "../features/auth/schemas";

test("khai báo: kiểm tra ngày sinh, bốn phòng ban, bỏ quyền do client gửi", () => {
  const input = {
    name: " Nguyễn Văn A ",
    birthDate: "20/05/2001",
    department: "Sales",
    branchId: "branch",
    role: "ADMIN",
    group: "OLD",
  };
  const parsed = participantSchema.parse(input);
  assert.equal(parsed.name, "Nguyễn Văn A");
  assert.equal(parsed.birthDate, "2001-05-20");
  assert.equal(
    participantSchema.parse({ ...input, birthDate: "29/02/2000" }).birthDate,
    "2000-02-29",
  );
  assert.equal("role" in parsed, false);
  assert.equal("group" in parsed, false);
  for (const department of ["Sales", "CS", "OPS", "Thực tập sinh"])
    assert.equal(
      participantSchema.safeParse({ ...input, department }).success,
      true,
    );
  for (const values of [
    { department: "Khác" },
    { birthDate: "29/02/2001" },
    { birthDate: "31/04/2001" },
    { birthDate: "01/01/2099" },
    { birthDate: "31/12/1899" },
    { birthDate: "05/20/2001" },
    { birthDate: "2001-05-20" },
    { name: " " },
    { branchId: "" },
  ])
    assert.equal(
      participantSchema.safeParse({ ...input, ...values }).success,
      false,
    );
});
