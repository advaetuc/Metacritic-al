export default function Home() {
  return (
    <main className="landing-shell">
      <section className="glass-panel landing-panel" aria-labelledby="welcome-title">
        <p className="landing-kicker">The cinema after dark</p>
        <h1 id="welcome-title">Metacritic-al</h1>
        <p className="landing-copy">Your taste, on trial.</p>
        <p className="landing-note">
          A movie roast is in the works. Pick a film, choose your heat, and let the
          credits roll.
        </p>
        <span className="glass-chip status-chip">Coming soon</span>
      </section>
    </main>
  );
}
