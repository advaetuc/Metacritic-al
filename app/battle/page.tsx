import { Suspense } from "react";
import { BattleExperience } from "@/components/battle/battle-experience";

export default function BattlePage() {
  return <Suspense fallback={<main className="battle-shell"><p>Loading the critics…</p></main>}><BattleExperience /></Suspense>;
}
