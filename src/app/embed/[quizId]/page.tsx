import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { QuizPlayer } from "@/app/q/[workspaceSlug]/[quizSlug]/player-client";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { quizId: string } }): Promise<Metadata> {
  const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId } });
  if (!quiz) return {};
  return {
    title: quiz.title,
    description: quiz.description ?? undefined,
  };
}

export default async function EmbedQuiz({ params }: { params: { quizId: string } }) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.quizId },
    include: {
      questions: { orderBy: { order: "asc" }, include: { answers: { orderBy: { order: "asc" } } } },
    },
  });
  if (!quiz || quiz.status !== "PUBLISHED") notFound();

  return (
    <div style={{ minHeight: "100vh", padding: "16px 8px", background: "transparent" }}>
      <QuizPlayer
        quiz={{
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          ctaText: quiz.ctaText,
          ctaUrl: quiz.ctaUrl,
          primaryColor: quiz.primaryColor,
          accentColor: quiz.accentColor,
          privacyText: quiz.privacyText,
          resultMappings: (quiz.resultMappings as any) || [],
          questions: quiz.questions.map((q) => ({
            id: q.id,
            text: q.text,
            answers: q.answers.map((a) => ({ id: a.id, text: a.text, score: a.score })),
          })),
        }}
      />
    </div>
  );
}
