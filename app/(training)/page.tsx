import { ArrowUpRight, BookOpen, Layers3 } from "lucide-react";
import Link from "next/link";
import { StartButton } from "@/features/quiz/components/start-button";
import { getHome } from "@/features/training/queries";
import { percentage } from "@/lib/format";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const data = await getHome();
  const groups = [...new Set(data.topics.map((t) => t.part))];
  return (
    <div className="wrap page">
      {search.cancelled === "1" && (
        <p className="notice">
          Bài này đã hủy hoặc bỏ dở quá 24 giờ. Bạn có thể bắt đầu một lượt mới.
        </p>
      )}
      <div className="section-heading">
        <div>
          <p className="kicker">HÀNH TRÌNH CỦA BẠN</p>
          <h2>Sẵn sàng cho bước tiến tiếp theo?</h2>
        </div>
        <BookOpen className="heading-icon" aria-hidden="true" />
      </div>
      <div className="stats">
        <div className="stat">
          <b>
            {data.mine?.done ?? 0}
            <small> / {data.topics.length}</small>
          </b>
          <span>Chủ đề đã làm</span>
        </div>
        <div className="stat">
          <b>
            {data.mine?.sum ?? 0}
            <small> / {data.maximum}</small>
          </b>
          <span>Tổng điểm tốt nhất</span>
        </div>
        <div className="stat">
          <b>
            {data.rank ? `#${data.rank}` : "—"}
            <small>{data.rank ? ` / ${data.rows.length}` : ""}</small>
          </b>
          <span>Hạng tổng hiện tại</span>
        </div>
      </div>
      {data.active && (
        <aside className="notice warning">
          <strong>Bạn có bài đang làm: {data.active.title}</strong>
          <Link href={`/lam-bai/${data.active.id}`} className="btn">
            Tiếp tục bài làm <ArrowUpRight size={16} />
          </Link>
        </aside>
      )}
      <section className="mix-panel">
        <div className="mix-icon">
          <Layers3 aria-hidden="true" />
        </div>
        <div>
          <span className="kicker">THỬ THÁCH TỔNG HỢP</span>
          <h3>Kiểm tra toàn bộ kiến thức</h3>
          <p>
            {Math.min(data.settings.mixedCount, data.maximum)} câu ngẫu nhiên ·
            Mỗi lượt là một thử thách mới
          </p>
          {data.settings.maxAttempts > 0 &&
            (data.counts.mixed ?? 0) >= data.settings.maxAttempts && (
              <p className="note">
                Đã hết lượt thi tổng hợp. Liên hệ quản trị nếu cần thêm lượt.
              </p>
            )}
        </div>
        <StartButton
          topicId={null}
          hasActive={!!data.active}
          disabled={
            !data.maximum ||
            !!(
              data.settings.maxAttempts &&
              (data.counts.mixed ?? 0) >= data.settings.maxAttempts
            )
          }
          className="btn primary"
        >
          Bắt đầu thi <ArrowUpRight size={17} />
        </StartButton>
      </section>
      <p className="note">
        Ngưỡng đạt {data.settings.passThreshold}% · Điểm tổng chỉ cộng các chủ
        đề, không cộng thi tổng hợp.
      </p>
      {groups.map((part) => (
        <section key={part}>
          <h3 className="part-heading">{part}</h3>
          <div className="topic-list">
            {data.topics
              .filter((t) => t.part === part)
              .map((topic) => {
                const best = data.best[topic.id];
                const limit =
                  data.settings.maxAttempts > 0 &&
                  (data.counts[topic.id] ?? 0) >= data.settings.maxAttempts;
                return (
                  <div key={topic.id}>
                    <StartButton
                      topicId={topic.id}
                      hasActive={!!data.active}
                      disabled={limit || !topic._count.questions}
                      className="topic-row"
                    >
                      <span className="topic-code">{topic.code}</span>
                      <span className="topic-description">
                        <strong>{topic.title}</strong>
                        <small>
                          {topic._count.questions} câu hỏi
                          {topic.timeLimitMin
                            ? ` · ${topic.timeLimitMin} phút`
                            : " · Không giới hạn giờ"}
                          {limit ? " · Đã hết lượt" : ""}
                        </small>
                      </span>
                      <span
                        className={`chip ${best ? (best.passed ? "pass" : "fail") : "none"}`}
                      >
                        {best
                          ? `${best.score}/${best.total} · ${percentage(best.percentage)}`
                          : "Chưa làm"}
                      </span>
                      <ArrowUpRight
                        className="topic-arrow"
                        size={18}
                        aria-hidden="true"
                      />
                    </StartButton>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
