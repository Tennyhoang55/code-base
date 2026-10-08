"use client";
import { ChevronLeft, ChevronRight, Clock3, Flag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { cancelQuiz, saveQuiz } from "../actions";
import { answerMapSchema, type QuizView } from "../schemas";

export function QuizPlayer({ quiz }: { quiz: QuizView }) {
  const router = useRouter();
  const storageKey = `sunway-quiz:${quiz.id}`;
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.parse(quiz.serverNow));
  const [answers, setAnswers] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      quiz.questions
        .filter((q) => q.selectedIndex !== null)
        .map((q) => [q.id, q.selectedIndex ?? 0]),
    ),
  );
  const answersRef = useRef(answers);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const busyRef = useRef(false);
  const [message, setMessage] = useState("Đáp án được lưu tự động.");
  const [confirm, setConfirm] = useState<"submit" | "quit" | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const question = quiz.questions[index];
  const deadline = quiz.deadlineAt
    ? Date.parse(quiz.deadlineAt)
    : Date.parse(quiz.expiresAt);
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));

  const sync = useCallback(
    (values: Record<string, number>, submit = false) => {
      chain.current = chain.current.then(async () => {
        try {
          const reply = await saveQuiz({
            id: quiz.id,
            answers: values,
            submit,
          });
          if (!reply.ok) {
            setMessage(
              reply.message ??
                "Chưa lưu được. Đáp án vẫn lưu trên thiết bị, hãy thử lại.",
            );
            return;
          }
          if (reply.status !== "ACTIVE") {
            localStorage.removeItem(storageKey);
            router.replace(
              reply.status === "SUBMITTED" ? `/ket-qua/${quiz.id}` : "/",
            );
            router.refresh();
          } else setMessage("Đã lưu đáp án lên hệ thống.");
        } catch {
          setMessage(
            "Mất kết nối. Đáp án của bạn vẫn lưu trên thiết bị. Kết nối lại để đồng bộ hoặc thử nộp lại.",
          );
        }
      });
      return chain.current;
    },
    [quiz.id, router, storageKey],
  );

  useEffect(() => {
    try {
      const cache = localStorage.getItem(storageKey);
      const parsed = cache
        ? answerMapSchema.safeParse(JSON.parse(cache))
        : null;
      if (parsed?.success) {
        const restored = Object.fromEntries(
          Object.entries(parsed.data).filter(([key]) =>
            quiz.questions.some((q) => q.id === key),
          ),
        );
        const merged = { ...answersRef.current, ...restored };
        answersRef.current = merged;
        setAnswers(merged);
        if (Object.keys(restored).length) void sync(merged);
      }
    } catch {
      setMessage(
        "Bộ nhớ trình duyệt không khả dụng. Giữ kết nối để đáp án được lưu lên hệ thống.",
      );
    }
    setReady(true);
    const start = performance.now();
    const server = Date.parse(quiz.serverNow);
    const interval = setInterval(
      () => setNow(server + performance.now() - start),
      1000,
    );
    const reconnect = () => {
      void sync(answersRef.current);
    };
    window.addEventListener("online", reconnect);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", reconnect);
    };
  }, [quiz.serverNow, quiz.questions, storageKey, sync]);

  const submit = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    await sync(answersRef.current, true);
    busyRef.current = false;
    setBusy(false);
    setConfirm(null);
  }, [sync]);
  useEffect(() => {
    if (ready && remaining <= 0 && !busyRef.current) {
      const timeout = setTimeout(() => {
        void submit();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [ready, remaining, submit]);

  function choose(selectedIndex: number) {
    if (!question || busy || remaining <= 0) return;
    const next = { ...answersRef.current, [question.id]: selectedIndex };
    answersRef.current = next;
    setAnswers(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setMessage("Không lưu được trên thiết bị. Hãy giữ kết nối mạng.");
    }
    setConfirm(null);
    setMessage("Đang đồng bộ đáp án…");
    void sync({ [question.id]: selectedIndex });
  }
  async function quit() {
    setBusy(true);
    await chain.current;
    try {
      const result = await cancelQuiz(quiz.id);
      if (result.ok) {
        localStorage.removeItem(storageKey);
        router.replace("/");
        router.refresh();
      } else setMessage(result.message ?? "Không thể thoát.");
    } catch {
      setMessage("Mất kết nối. Hãy thử thoát lại.");
    } finally {
      setBusy(false);
    }
  }
  if (!question)
    return (
      <p>
        Không tìm thấy câu hỏi. <Link href="/">Về trang chủ</Link>
      </p>
    );
  const answered = Object.keys(answers).length;
  return (
    <div className="wrap page">
      <section className="panel quiz-panel">
        <div className="quiz-top">
          <div>
            <p className="kicker">BÀI KIỂM TRA</p>
            <h2>{quiz.title}</h2>
          </div>
          <span
            className={`timer ${remaining < 60 && quiz.deadlineAt ? "error" : ""}`}
          >
            <Clock3 size={17} aria-hidden="true" />
            {quiz.deadlineAt
              ? `Còn ${formatDuration(remaining)}`
              : formatDuration((now - Date.parse(quiz.startedAt)) / 1000)}
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Số câu đã trả lời"
          aria-valuenow={answered}
          aria-valuemin={0}
          aria-valuemax={quiz.questions.length}
        >
          <div
            style={{ width: `${(answered / quiz.questions.length) * 100}%` }}
          />
        </div>
        <p className="question-number">
          Câu {index + 1} / {quiz.questions.length} · đã trả lời {answered}
        </p>
        <h3 className="question-text">{question.text}</h3>
        <div className="options">
          {question.options.map((option, i) => (
            <button
              key={`${question.id}-${option}`}
              type="button"
              className="option"
              aria-pressed={answers[question.id] === i}
              disabled={busy || remaining <= 0}
              onClick={() => choose(i)}
            >
              <span>{String.fromCharCode(65 + i)}</span>
              <strong>{option}</strong>
            </button>
          ))}
        </div>
        <div className="quiz-controls">
          <Button
            variant="outline"
            disabled={index === 0 || busy}
            onClick={() => setIndex((i) => i - 1)}
          >
            <ChevronLeft size={17} />
            Câu trước
          </Button>
          {index === quiz.questions.length - 1 ? (
            <Button
              className="action-primary"
              disabled={busy}
              onClick={() => setConfirm("submit")}
            >
              Nộp bài <Flag size={17} />
            </Button>
          ) : (
            <Button
              className="action-primary"
              disabled={busy}
              onClick={() => setIndex((i) => i + 1)}
            >
              Câu tiếp <ChevronRight size={17} />
            </Button>
          )}
        </div>
        <nav className="question-grid" aria-label="Chuyển đến câu hỏi">
          {quiz.questions.map((q, i) => (
            <button
              type="button"
              key={q.id}
              className={`${answers[q.id] !== undefined ? "answered" : ""} ${index === i ? "current" : ""}`}
              aria-current={index === i ? "step" : undefined}
              aria-label={`Câu ${i + 1}${answers[q.id] !== undefined ? ", đã trả lời" : ", chưa trả lời"}`}
              onClick={() => setIndex(i)}
            >
              {i + 1}
            </button>
          ))}
        </nav>
        <div className="quiz-footer">
          <Button
            variant="ghost"
            onClick={() => setConfirm("submit")}
            disabled={busy}
          >
            Nộp bài sớm
          </Button>
          <Button
            variant="ghost"
            onClick={() => setConfirm("quit")}
            disabled={busy}
          >
            Thoát bài
          </Button>
        </div>
        {confirm && (
          <section className="notice warning" aria-label="Xác nhận">
            <p>
              {confirm === "submit"
                ? `Còn ${quiz.questions.length - answered} câu chưa trả lời. Câu bỏ trống tính là sai. Nộp bài ngay?`
                : "Thoát bài sẽ hủy lượt làm và không tính điểm. Bạn muốn thoát?"}
            </p>
            <div className="row">
              <Button
                className="action-primary"
                disabled={busy}
                onClick={() =>
                  confirm === "submit" ? void submit() : void quit()
                }
              >
                {busy
                  ? "Đang xử lý…"
                  : confirm === "submit"
                    ? "Nộp bài"
                    : "Xác nhận thoát"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirm(null)}
                disabled={busy}
              >
                Làm tiếp
              </Button>
            </div>
          </section>
        )}
        <p className="sync-note" role="status">
          {message}
        </p>
        {remaining <= 0 && (
          <p className="error">
            Đã hết thời gian. Đang nộp các đáp án đã lưu trước thời hạn.
          </p>
        )}
      </section>
    </div>
  );
}
