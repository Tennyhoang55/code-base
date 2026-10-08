"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  importBank,
  importEmployees,
  previewBank,
  previewEmployees,
} from "../actions";
import type { AdminState } from "../schemas";

function CredentialDownload({
  credentials,
}: {
  credentials: NonNullable<AdminState["credentials"]>;
}) {
  function download() {
    const blob = new Blob(
      [
        "\uFEFFMã NV,Mật khẩu tạm\r\n" +
          credentials
            .map((c) => `${c.employeeCode},${c.password}`)
            .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mat-khau-tam.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="secret">
      <p>
        {credentials.length} mật khẩu tạm đã tạo. Chỉ tải được từ kết quả nhập
        này.
      </p>
      <Button type="button" onClick={download}>
        Tải danh sách mật khẩu tạm
      </Button>
    </div>
  );
}
export function ImportPanel({ bank = false }: { bank?: boolean }) {
  const [preview, previewAction, checking] = useActionState(
    bank ? previewBank : previewEmployees,
    {},
  );
  return (
    <section className="panel">
      <h3>{bank ? "Nhập ngân hàng câu hỏi" : "Nhập nhân sự hàng loạt"}</h3>
      <p className="note">
        {bank
          ? "File JSON theo định dạng questions.json. Câu trùng mã được cập nhật."
          : "File .xlsx hoặc .csv, tối đa 1.000 dòng và 2 MB. Xem trước rồi xác nhận để nhập."}
      </p>
      {!bank && (
        <a className="btn" href="/quan-tri/xuat?kind=template">
          Tải file Excel mẫu
        </a>
      )}
      <form
        action={previewAction}
        className="form-stack"
        style={{ marginTop: 16 }}
      >
        <label
          htmlFor={bank ? "bank-file" : "staff-file"}
          className="field-label"
        >
          Chọn file
        </label>
        <input
          id={bank ? "bank-file" : "staff-file"}
          type="file"
          name="file"
          accept={bank ? ".json" : ".xlsx,.csv"}
          required
        />
        <Button type="submit" disabled={checking} variant="outline">
          {checking ? "Đang kiểm tra…" : "Xem trước dữ liệu"}
        </Button>
      </form>
      {preview.message && (
        <p role="status" className="note">
          {preview.message}
        </p>
      )}
      {preview.preview && (
        <div className="notice">
          <strong>
            {preview.preview.valid}/{preview.preview.total} dòng hợp lệ
          </strong>
          {bank && (
            <p>
              {preview.preview.added} câu thêm mới · {preview.preview.updated}{" "}
              câu cập nhật
            </p>
          )}
          <ul className="preview-errors">
            {preview.preview.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          {preview.payload && preview.preview.valid > 0 && (
            <CommitImport
              key={preview.payload}
              bank={bank}
              payload={preview.payload}
              count={preview.preview.valid}
            />
          )}
        </div>
      )}
    </section>
  );
}

function CommitImport({
  bank,
  payload,
  count,
}: {
  bank: boolean;
  payload: string;
  count: number;
}) {
  const [result, importAction, importing] = useActionState(
    bank ? importBank : importEmployees,
    {},
  );
  return (
    <>
      {!result.success && (
        <form action={importAction}>
          <input type="hidden" name="payload" value={payload} />
          <Button type="submit" disabled={importing} className="action-primary">
            {importing
              ? "Đang nhập…"
              : `Xác nhận nhập ${count} ${bank ? "câu" : "nhân sự"}`}
          </Button>
        </form>
      )}
      {result.message && (
        <p
          role="status"
          className={`notice ${result.success ? "success" : "error"}`}
        >
          {result.message}
        </p>
      )}
      {result.credentials && (
        <CredentialDownload credentials={result.credentials} />
      )}
    </>
  );
}
