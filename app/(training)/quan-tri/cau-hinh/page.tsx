import { saveSettings } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/action-form";
import { getAdminCatalog } from "@/features/admin/queries";
export default async function Page() {
  const { settings } = await getAdminCatalog();
  return (
    <>
      <h2>Cấu hình chung</h2>
      <section className="panel">
        <ActionForm action={saveSettings}>
          <div className="editor-grid">
            <label>
              Ngưỡng đạt (%)
              <input
                name="passThreshold"
                type="number"
                min={1}
                max={100}
                defaultValue={settings.passThreshold}
                required
              />
              <small className="note">
                Áp dụng cho các bài nộp sau khi lưu cấu hình.
              </small>
            </label>
            <label>
              Số câu thi tổng hợp
              <input
                name="mixedCount"
                type="number"
                min={1}
                max={1000}
                defaultValue={settings.mixedCount}
                required
              />
              <small className="note">
                Nếu ngân hàng có ít câu hơn, lấy toàn bộ câu đang bật.
              </small>
            </label>
            <label>
              Số lần làm tối đa mỗi bài
              <input
                name="maxAttempts"
                type="number"
                min={0}
                max={1000}
                defaultValue={settings.maxAttempts}
                required
              />
              <small className="note">
                0 = không giới hạn. Chỉ đếm bài đã nộp.
              </small>
            </label>
            <div>
              <label className="checkbox-row">
                <input
                  name="showAnswers"
                  type="checkbox"
                  defaultChecked={settings.showAnswers}
                />
                Hiện đáp án sau khi nộp
              </label>
              <label className="checkbox-row">
                <input
                  name="allowLeaderboard"
                  type="checkbox"
                  defaultChecked={settings.allowLeaderboard}
                />
                Nhân sự xem bảng xếp hạng
              </label>
            </div>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
