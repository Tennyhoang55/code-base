import { CheckCircle2, Trophy } from "lucide-react";
import Link from "next/link";
import { Review } from "@/features/quiz/components/review";
import { StartButton } from "@/features/quiz/components/start-button";
import { getResult } from "@/features/training/queries";
import { formatDate, formatDuration, percentage } from "@/lib/format";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getResult(id);
  return (
    <div className="wrap page">
      <section className="panel result-panel">
        <p className="kicker">KẾT QUẢ BÀI KIỂM TRA</p>
        <h2>{result.title}</h2>
        <p className="muted">
          {result.user.name} · {formatDate(result.submittedAt)}
        </p>
        <div className="score-block">
          <div className="big-score">
            {result.score}
            <small>/{result.total}</small>
          </div>
          <div>
            <span className={`chip ${result.passed ? "pass" : "fail"}`}>
              <CheckCircle2 size={15} />
              {result.passed ? "Đạt" : "Chưa đạt"} ·{" "}
              {percentage(result.percentage)}
            </span>
            <p className="note">
              Thời gian {formatDuration(result.durationSeconds)} · Ngưỡng đạt{" "}
              {result.passThreshold}%
            </p>
            {result.rank > 0 && (
              <p className="note">
                <Trophy size={15} /> Hạng hiện tại #{result.rank}/
                {result.rankTotal}
              </p>
            )}
          </div>
        </div>
        <div className="row">
          <StartButton
            topicId={result.topicId}
            hasActive={result.hasActive}
            disabled={!result.canRetry}
          >
            Làm lại
          </StartButton>
          <Link href="/" className="btn">
            Chọn chủ đề khác
          </Link>
          {result.allowLeaderboard && (
            <Link
              href={`/xep-hang?topic=${result.topicId ?? "mixed"}`}
              className="btn"
            >
              Xem bảng xếp hạng
            </Link>
          )}
        </div>
        {result.exhausted && (
          <p className="note">
            Bạn đã hết lượt làm cho bài này. Liên hệ quản trị nếu cần thêm lượt.
          </p>
        )}
      </section>
      {result.questions.length ? (
        <Review questions={result.questions} />
      ) : (
        <p className="notice">
          Quản trị đang tắt xem đáp án sau khi nộp. Điểm và thời gian của bạn
          vẫn được lưu.
        </p>
      )}
    </div>
  );
}
