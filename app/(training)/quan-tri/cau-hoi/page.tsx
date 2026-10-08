import { z } from "zod";
import { FilterFields } from "@/components/shared/filters";
import {
  QuestionEditor,
  TopicEditor,
} from "@/features/admin/components/editors";
import { ImportPanel } from "@/features/admin/components/import-panel";
import { getAdminCatalog, getQuestionStats } from "@/features/admin/queries";
import { filters, type Search } from "@/features/training/queries";
import { percentage } from "@/lib/format";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const f = filters(search);
  const [data, questions] = await Promise.all([
    getAdminCatalog(),
    getQuestionStats(search),
  ]);
  const pages = Math.max(1, Math.ceil(questions.length / 25));
  const page = Math.min(
    pages,
    z.coerce.number().int().min(1).catch(1).parse(search.page),
  );
  const visibleQuestions = questions.slice((page - 1) * 25, page * 25);
  return (
    <>
      <h2>Ngân hàng câu hỏi</h2>
      <section className="panel">
        <h3>Chủ đề</h3>
        {data.topics.map((t) => (
          <details className="editor-details" key={t.id}>
            <summary>
              {t.code} · {t.title} · {t._count.questions} câu
              {!t.isActive ? " · Đang ẩn" : ""}
            </summary>
            <TopicEditor topic={t} />
          </details>
        ))}
      </section>
      <section className="panel">
        <details>
          <summary className="field-label">Thêm câu hỏi mới</summary>
          <QuestionEditor topics={data.topics} />
        </details>
      </section>
      <section className="panel">
        <form className="filter-grid" key={JSON.stringify(f)}>
          <label>
            Tìm câu hỏi
            <input name="q" defaultValue={f.q} placeholder="Nhập từ khóa" />
          </label>
          <FilterFields topics={data.topics} date={false} values={f} />
          <button className="btn primary" type="submit">
            Tìm câu hỏi
          </button>
        </form>
        <p className="note">
          {questions.length} câu phù hợp. Ẩn câu để ngưng sử dụng; nội dung bài
          làm cũ được giữ nguyên.
        </p>
        {visibleQuestions.map((q) => (
          <article key={q.id} className="admin-question">
            <div className="row">
              <span className="note">
                {q.id} · Chương {q.topic.code}
              </span>
              <span className={`chip ${q.isActive ? "pass" : "none"}`}>
                {q.isActive ? "Đang bật" : "Đang ẩn"}
              </span>
            </div>
            <h4>{q.text}</h4>
            <p className="note">
              {q.count
                ? `${q.count} lượt · ${percentage(q.rate)} trả lời đúng`
                : "Chưa có lượt trả lời"}
            </p>
            <details className="editor-details">
              <summary>Sửa / ẩn câu hỏi</summary>
              <QuestionEditor topics={data.topics} question={q} />
            </details>
            <details className="editor-details">
              <summary>Xem trước câu hỏi</summary>
              <div className="preview-question">
                <strong>{q.text}</strong>
                <ol type="A">
                  {q.options.map((option) => (
                    <li key={`${q.id}-${option}`}>{option}</li>
                  ))}
                </ol>
                <p className="note">
                  Góc nhìn nhân sự không hiển thị đáp án đúng hoặc giải thích
                  khi đang thi. Đáp án sẽ được xáo trộn mỗi lượt.
                </p>
              </div>
            </details>
          </article>
        ))}
        {!questions.length && <p className="empty">Không tìm thấy câu hỏi.</p>}
        {pages > 1 && (
          <nav className="row" aria-label="Trang câu hỏi">
            {page > 1 && (
              <a
                className="btn"
                href={`?${new URLSearchParams({ ...f, page: String(page - 1) })}`}
              >
                Trang trước
              </a>
            )}
            <span className="note">
              Trang {page}/{pages} · 25 câu mỗi trang
            </span>
            {page < pages && (
              <a
                className="btn"
                href={`?${new URLSearchParams({ ...f, page: String(page + 1) })}`}
              >
                Trang tiếp
              </a>
            )}
          </nav>
        )}
      </section>
      <ImportPanel bank />
      <section className="panel">
        <h3>Xuất ngân hàng câu hỏi</h3>
        <div className="row">
          <a className="btn" href="/quan-tri/xuat?kind=bank-json">
            Tải JSON
          </a>
          <a className="btn" href="/quan-tri/xuat?kind=bank-excel">
            Tải Excel
          </a>
        </div>
      </section>
    </>
  );
}
