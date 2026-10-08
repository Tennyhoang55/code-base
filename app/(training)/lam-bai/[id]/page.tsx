import { redirect } from "next/navigation";
import { QuizPlayer } from "@/features/quiz/components/quiz-player";
import { getAttemptStatus, getQuiz } from "@/features/training/queries";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = await getQuiz(id);
  if (!quiz) {
    if ((await getAttemptStatus(id)) === "CANCELLED") redirect("/?cancelled=1");
    redirect(`/ket-qua/${id}`);
  }
  return <QuizPlayer quiz={quiz} />;
}
