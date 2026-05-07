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

/**
 * Sceglie quale logo mostrare in base allo sfondo del quiz.
 * Priorità: override sul quiz > logo workspace (chiaro o scuro).
 *
 * Determina se lo sfondo è "scuro" guardando la luminosità del colore primario.
 */
function chooseLogo(opts: {
  quizLogoUrl: string | null;
  workspaceLogoUrl: string | null;
  workspaceLogoUrlDark: string | null;
  primaryColor: string;
}): string | null {
  // Override del quiz vince sempre
  if (opts.quizLogoUrl) return opts.quizLogoUrl;

  // Calcola luminosità del primaryColor (background del quiz)
  const isDark = isColorDark(opts.primaryColor);

  if (isDark && opts.workspaceLogoUrlDark) return opts.workspaceLogoUrlDark;
  return opts.workspaceLogoUrl;
}

function isColorDark(hex: string): boolean {
  if (!hex || !hex.startsWith("#")) return true;
  const cleaned = hex.replace("#", "");
  const fullHex =
    cleaned.length === 3
      ? cleaned.split("").map((c) => c + c).join("")
      : cleaned;
  if (fullHex.length !== 6) return true;
  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
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

  const logoToShow = chooseLogo({
    quizLogoUrl: quiz.logoUrl,
    workspaceLogoUrl: ws.logoUrl,
    workspaceLogoUrlDark: ws.logoUrlDark,
    primaryColor: quiz.primaryColor,
  });

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
    </main>
  );
}
