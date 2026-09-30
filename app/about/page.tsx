import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About & content policy",
  description: "How Metacritic-al creates original movie satire and fictional review-card metrics.",
};

export default function AboutPage() {
  return (
    <main className="about-shell">
      <article className="glass-panel about-panel">
        <Link className="about-back" href="/">← Back to the studio</Link>
        <p className="landing-kicker">A note from the projection booth</p>
        <h1>About Metacritic-al</h1>
        <p className="about-lede">A zero-backend movie-roast generator. It turns a film title, a critic persona and a little heat into original, deterministic satire.</p>

        <h2>Content policy</h2>
        <ul>
          <li>We roast films and fictional taste takes, never a person’s body, identity, health or private life.</li>
          <li>We avoid protected-class jokes, slurs, threats and sexual content.</li>
          <li>Review text is original. Plot points and scenes may be paraphrased; dialogue, lyrics and published reviews are not reproduced.</li>
          <li>Film titles and names are treated as text. The app is independent and is not affiliated with filmmakers, studios or review platforms.</li>
        </ul>

        <h2>The numbers are fictional</h2>
        <p>Reviewers, ratings, watched times, likes and comments are generated for the joke. They do not describe real people, audience activity or an official film score. The same inputs produce the same card so a shared link can replay it.</p>
        <p className="about-note">The poster artwork is procedural and does not use official movie posters.</p>
        <Link className="about-cta" href="/">Make a review</Link>
      </article>
    </main>
  );
}
