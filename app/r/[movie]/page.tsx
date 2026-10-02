import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { generateReview, buildReviewPermalink } from "@/lib/engine";
import type { GenerateReviewInput } from "@/lib/engine/types";
import { getContentManifest, getMoviePackForPage, getVibePackForPage } from "@/lib/data/server-content";
import { GlassReviewCard } from "@/components/studio/glass-review-card";
import { ReviewActions } from "@/components/share/review-actions";

type PageProps = { params: Promise<{ movie: string }> };

export const dynamicParams = false;

export async function generateStaticParams(): Promise<Array<{ movie: string }>> {
  const manifest = await getContentManifest();
  return Object.keys(manifest.movies).map((movie) => ({ movie }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { movie: id } = await params;
  const pack = await getMoviePackForPage(id);
  if (!pack) return { title: "Review not found" };
  const description = `A deterministic, fictional review of ${pack.title} (${pack.year}). Your taste, on trial.`;
  return {
    title: `${pack.title} review`,
    description,
    openGraph: {
      type: "article",
      title: `${pack.title} review | Metacritic-al`,
      description,
      siteName: "Metacritic-al",
    },
    twitter: {
      card: "summary",
      title: `${pack.title} review | Metacritic-al`,
      description,
    },
  };
}

export default async function CuratedMoviePage({ params }: PageProps) {
  const { movie: id } = await params;
  const moviePack = await getMoviePackForPage(id);
  if (!moviePack) notFound();
  const vibe = "film-student" as const;
  const input: GenerateReviewInput = {
    title: moviePack.title,
    vibe,
    heat: 0,
    sentiment: "love",
    k: 0,
    moviePack,
  };
  const vibePack = await getVibePackForPage(vibe);
  const model = generateReview(input, vibePack);
  const permalink = buildReviewPermalink(input, moviePack.id);

  return (
    <main className="permalink-shell curated-review-shell">
      <div className="permalink-result">
        <p className="landing-kicker">Curated film · {moviePack.year}</p>
        <GlassReviewCard model={model} />
        <ReviewActions model={model} permalink={permalink} />
        <p className="fictional-note">This is original satire. Ratings, usernames, timestamps, likes and comments are fictional.</p>
        <Link className="fictional-note about-inline-link" href="/about/">Read the content policy</Link>
        <Link className="permalink-home" href="/">Roast another film</Link>
      </div>
    </main>
  );
}
