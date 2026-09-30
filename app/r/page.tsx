import { Suspense } from "react";
import { PermalinkExperience } from "@/components/permalink/permalink-experience";

export default function ReviewPermalinkPage() {
  return <Suspense fallback={<main className="permalink-shell"><p>Loading your review…</p></main>}><PermalinkExperience /></Suspense>;
}
