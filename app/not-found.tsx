import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-shell">
      <section className="glass-panel not-found-panel">
        <div className="not-found-reel" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        <p className="landing-kicker">The reel is missing</p>
        <h1>404</h1>
        <p>This scene didn’t make the final cut. The page may have moved, or the film may not be in our curated list yet.</p>
        <Link className="about-cta" href="/">Back to the studio</Link>
      </section>
    </main>
  );
}
