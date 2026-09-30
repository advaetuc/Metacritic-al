"use client";

import type { ReviewModel } from "@/lib/engine/types";
import { GlassReviewCard } from "@/components/studio/glass-review-card";
import { ReviewActions } from "@/components/share/review-actions";

export function BattleCard({ left, right, leftHref, rightHref }: {
  left: ReviewModel;
  right: ReviewModel;
  leftHref: string;
  rightHref: string;
}) {
  return (
    <section className="battle-card" aria-label="Roast battle comparison">
      {[{ model: left, href: leftHref, side: "A" }, { model: right, href: rightHref, side: "B" }].map(({ model, href, side }) => (
        <article className="battle-side" key={side}>
          <h2><span>{side}</span> {model.vibe.replaceAll("-", " ")}</h2>
          <GlassReviewCard model={model} />
          <ReviewActions model={model} permalink={href} />
        </article>
      ))}
    </section>
  );
}
