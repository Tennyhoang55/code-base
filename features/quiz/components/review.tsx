"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function Review({
  questions,
}: {
  questions: {
    id: string;
    text: string;
    options: string[];
    selectedIndex: number | null;
    correctIndex: number;
    explanation: string;
  }[];
}) {
  const [wrongOnly, setWrongOnly] = useState(false);
  return (
    <section>
      <div className="section-heading">
        <h3>Xem lại đáp án</h3>
        <Button
          variant="outline"
          aria-pressed={wrongOnly}
          onClick={() => setWrongOnly((v) => !v)}
        >
          {wrongOnly ? "Hiện tất cả câu" : "Chỉ xem câu sai"}
        </Button>
      </div>
      <div className="review-list">
        {questions
          .map((q, i) => ({ ...q, number: i + 1 }))
          .filter((q) => !wrongOnly || q.selectedIndex !== q.correctIndex)
          .map((q) => (
            <article
              key={q.id}
              className={`review-card ${q.selectedIndex === q.correctIndex ? "correct" : "incorrect"}`}
            >
              <p className="question-number">
                Câu {q.number} ·{" "}
                {q.selectedIndex === q.correctIndex ? "Đúng" : "Sai"}
              </p>
              <h4>{q.text}</h4>
              <p
                className={
                  q.selectedIndex === q.correctIndex ? "good-text" : "error"
                }
              >
                Bạn chọn:{" "}
                {q.selectedIndex !== null
                  ? q.options[q.selectedIndex]
                  : "(bỏ trống)"}
              </p>
              <p className="good-text">
                Đáp án đúng: {q.options[q.correctIndex]}
              </p>
              <p className="explanation">{q.explanation}</p>
            </article>
          ))}
      </div>
    </section>
  );
}
