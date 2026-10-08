import { departmentSchema } from "@/features/auth/schemas";
import { saveEmployee, saveQuestion, saveTopic } from "../actions";
import { ActionForm } from "./action-form";

type Person = {
  id: string;
  employeeCode: string;
  name: string;
  email: string | null;
  branchId: string;
  role: "ADMIN" | "EMPLOYEE";
  isActive: boolean;
  identityType: "ACCOUNT" | "PARTICIPANT";
  birthDate: Date | null;
  department: string | null;
};
export function EmployeeEditor({
  branches,
  user,
}: {
  branches: { id: string; name: string }[];
  user?: Person;
}) {
  return (
    <ActionForm
      action={saveEmployee}
      label={user ? "Lưu hồ sơ" : "Tạo tài khoản quản trị"}
    >
      <input type="hidden" name="id" value={user?.id ?? ""} />
      <div className="editor-grid">
        <label>
          {user?.identityType === "PARTICIPANT" ? "Mã hồ sơ" : "Mã tài khoản"}
          <input
            name="employeeCode"
            defaultValue={user?.employeeCode}
            required
            maxLength={40}
            readOnly={user?.identityType === "PARTICIPANT"}
          />
        </label>
        {user?.identityType === "PARTICIPANT" && (
          <>
            <label>
              Ngày sinh
              <input
                name="birthDate"
                type="date"
                required
                defaultValue={user.birthDate?.toISOString().slice(0, 10)}
              />
            </label>
            <label>
              Phòng ban
              <select
                name="department"
                required
                defaultValue={user.department ?? ""}
              >
                {departmentSchema.options.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label>
          Họ tên
          <input
            name="name"
            defaultValue={user?.name}
            required
            maxLength={150}
          />
        </label>
        <label>
          Chi nhánh
          <select name="branchId" defaultValue={user?.branchId}>
            {branches.map((b) => (
              <option value={b.id} key={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Email (không bắt buộc)
          <input name="email" type="email" defaultValue={user?.email ?? ""} />
        </label>
        <label>
          Vai trò
          <select name="role" defaultValue={user?.role ?? "ADMIN"}>
            {user && <option value="EMPLOYEE">Người làm bài</option>}
            {user?.identityType !== "PARTICIPANT" && (
              <option value="ADMIN">Quản trị</option>
            )}
          </select>
        </label>
        <label className="checkbox-row">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={user?.isActive ?? true}
          />
          Tài khoản hoạt động
        </label>
      </div>
    </ActionForm>
  );
}
export type TopicEdit = {
  id: string;
  code: string;
  title: string;
  part: string;
  sort: number;
  isActive: boolean;
  timeLimitMin: number | null;
};
export function TopicEditor({ topic }: { topic: TopicEdit }) {
  return (
    <ActionForm action={saveTopic}>
      <input type="hidden" name="id" value={topic.id} />
      <div className="editor-grid">
        <label className="wide">
          Tên chủ đề
          <input name="title" defaultValue={topic.title} required />
        </label>
        <label>
          Nhóm phần
          <input name="part" defaultValue={topic.part} required />
        </label>
        <label>
          Thứ tự
          <input
            type="number"
            name="sort"
            min={0}
            max={10000}
            defaultValue={topic.sort}
            required
          />
        </label>
        <label>
          Giới hạn phút (trống = không giới hạn)
          <input
            type="number"
            name="timeLimitMin"
            min={1}
            max={1440}
            defaultValue={topic.timeLimitMin ?? ""}
          />
        </label>
        <label className="checkbox-row">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={topic.isActive}
          />
          Bật chủ đề
        </label>
      </div>
    </ActionForm>
  );
}
export type QuestionEdit = {
  id: string;
  topicId: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  isActive: boolean;
};
export function QuestionEditor({
  topics,
  question,
}: {
  topics: { id: string; code: string; title: string }[];
  question?: QuestionEdit;
}) {
  return (
    <ActionForm action={saveQuestion}>
      <input type="hidden" name="id" value={question?.id ?? ""} />
      <div className="editor-grid">
        <label className="wide">
          Chủ đề
          <select name="topicId" defaultValue={question?.topicId}>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} · {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Nội dung câu hỏi
          <textarea name="text" defaultValue={question?.text} required />
        </label>
        {[0, 1, 2, 3].map((i) => (
          <label key={i}>
            Đáp án {String.fromCharCode(65 + i)}
            <textarea
              name="options"
              defaultValue={question?.options[i]}
              required
            />
          </label>
        ))}
        <label>
          Đáp án đúng
          <select
            name="correctIndex"
            defaultValue={question?.correctIndex ?? 0}
          >
            {[0, 1, 2, 3].map((i) => (
              <option key={i} value={i}>
                {String.fromCharCode(65 + i)}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={question?.isActive ?? true}
          />
          Bật câu hỏi
        </label>
        <label className="wide">
          Giải thích / tham chiếu cẩm nang
          <textarea
            name="explanation"
            defaultValue={question?.explanation ?? ""}
          />
        </label>
      </div>
    </ActionForm>
  );
}
