import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { QuizPlayer } from "./player-client";
import type { Metadata } from "next";

type Params = { workspaceSlug: string; quizSlug: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const ws = await prisma.workspace.findUnique({ where: { slug: params.workspaceSlug } });
  if (!ws) return {};
  const quiz = await prisma.quiz.findUnique({
    where: { workspaceId_slug: { workspaceId: ws.id, slug: params.quizSlug } },
  });
  if (!quiz) return {};
  return {
    title: quiz.title,
    description: quiz.description ?? undefined,
    openGraph: {
      title: quiz.title,
      description: quiz.description ?? undefined,
      images: quiz.coverImageUrl ? [quiz.coverImageUrl] : undefined,
    },
  };
}

export default async function PublicQuizPage({ params }: { params: Params }) {
  const ws = await prisma.workspace.findUnique({ where: { slug: params.workspaceSlug } });
  if (!ws) notFound();

  const quiz = await prisma.quiz.findUnique({
    where: { workspaceId_slug: { workspaceId: ws.id, slug: params.quizSlug } },
    include: {
      questions: { orderBy: { order: "asc" }, include: { answers: { orderBy: { order: "asc" } } } },
    },
  });
  if (!quiz || quiz.status !== "PUBLISHED") notFound();

  return (
    <main
      className="min-h-screen px-4 py-10"
      style={{ background: quiz.primaryColor || "#0b0b0d" }}
    >
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
    </main>
  );
}
