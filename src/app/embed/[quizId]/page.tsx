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

function isColorDark(hex: string): boolean {
  if (!hex || !hex.startsWith("#")) return true;
  const cleaned = hex.replace("#", "");
  const fullHex =
    cleaned.length === 3 ? cleaned.split("").map((c) => c + c).join("") : cleaned;
  if (fullHex.length !== 6) return true;
  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export default async function EmbedQuiz({ params }: { params: { quizId: string } }) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.quizId },
    include: {
      questions: { orderBy: { order: "asc" }, include: { answers: { orderBy: { order: "asc" } } } },
      workspace: true,
    },
  });
  if (!quiz || quiz.status !== "PUBLISHED") notFound();

  // Sceglie il logo giusto in base allo sfondo
  const isDark = isColorDark(quiz.primaryColor);
  const logoToShow =
    quiz.logoUrl ??
    (isDark && quiz.workspace.logoUrlDark ? quiz.workspace.logoUrlDark : quiz.workspace.logoUrl);

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
          logoUrl: quiz.logoPosition === "hidden" ? null : logoToShow,
          logoPosition: quiz.logoPosition,
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
