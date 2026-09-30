import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import type { CSSProperties, ReactNode } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { ContentManifest, MoviePack } from "../lib/engine/types";

const root = process.cwd();
const publicDir = path.join(root, "public");
const dataDir = path.join(publicDir, "data");
const outputDir = path.join(publicDir, "og");
const fontPath = path.join(root, "node_modules", "next", "dist", "compiled", "@vercel", "og", "Geist-Regular.ttf");
const WIDTH = 1200;
const HEIGHT = 630;

function div(style: CSSProperties, ...children: ReactNode[]) {
  return createElement("div", { style }, ...children);
}

function buildOgCard(movie: MoviePack) {
  const initials = movie.title.split(/\s+/u).filter(Boolean).slice(0, 3).map((part) => Array.from(part)[0]).join("").toUpperCase();
  const genres = movie.genres.map((genre) => genre === "scifi" ? "Sci-fi" : genre[0]!.toUpperCase() + genre.slice(1));
  return div({
    width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden",
    background: "linear-gradient(135deg, #050706 0%, #0a1110 58%, #11101a 100%)",
    color: "#f4f7f5", fontFamily: "Geist",
  },
  div({ position: "absolute", width: 620, height: 620, borderRadius: 999, right: -190, top: -230, backgroundColor: "#0fa968", opacity: 0.13 }),
  div({ position: "absolute", width: 470, height: 470, borderRadius: 999, right: 40, bottom: -320, backgroundColor: "#6a3dff", opacity: 0.13 }),
  div({ position: "absolute", inset: 0, padding: "54px 66px", display: "flex", flexDirection: "column", justifyContent: "space-between" },
    div({ display: "flex", justifyContent: "space-between", alignItems: "center" },
      div({ display: "flex", alignItems: "center", gap: 14 },
        div({ width: 14, height: 14, borderRadius: 99, backgroundColor: "#2bff88", boxShadow: "0 0 24px #2bff8866" }),
        div({ fontSize: 21, fontWeight: 700, letterSpacing: 1.2, color: "#f4f7f5" }, "METACRITIC-AL"),
      ),
      div({ border: "1px solid #ffffff26", borderRadius: 999, padding: "10px 18px", color: "#b9c4be", fontSize: 16 }, "A deterministic movie review"),
    ),
    div({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40, flex: 1 },
      div({ display: "flex", flexDirection: "column", justifyContent: "center", width: 730, gap: 20 },
        div({ color: "#2bff88", fontSize: 18, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }, `${movie.year}  ·  ${genres.join(" / ")}`),
        div({ fontSize: movie.title.length > 24 ? 64 : 78, lineHeight: 1.03, fontWeight: 700, letterSpacing: -2.6, overflowWrap: "anywhere" }, movie.title),
        div({ width: 80, height: 4, borderRadius: 99, background: "linear-gradient(90deg, #2bff88, #0fa968)" }),
        div({ color: "#b9c4be", fontSize: 24, lineHeight: 1.4 }, "Name a film. Pick a critic. Get roasted."),
      ),
      div({ width: 260, height: 360, flexShrink: 0, borderRadius: "22px 14px 22px 14px", border: "1px solid #ffffff45", background: "linear-gradient(145deg, #12372b, #183c37 44%, #26334f)", boxShadow: "0 22px 60px #00000077", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
        div({ position: "absolute", width: 210, height: 210, borderRadius: 999, right: -55, top: 10, backgroundColor: "#a2ffd2", opacity: 0.2 }),
        div({ position: "absolute", width: 300, height: 120, left: -20, bottom: 35, borderRadius: "50%", backgroundColor: "#050706", opacity: 0.55, transform: "rotate(-14deg)" }),
        div({ position: "relative", fontSize: 80, fontWeight: 700, letterSpacing: -8, color: "#ffffffeb", textShadow: "0 4px 28px #00000099" }, initials),
        div({ position: "absolute", left: 18, bottom: 17, right: 18, display: "flex", justifyContent: "space-between", color: "#f4f7f5", fontSize: 12, letterSpacing: 2 },
          div({ padding: "8px 10px", borderRadius: 999, backgroundColor: "#05070699" }, "PROCEDURAL ART"),
          div({ padding: "8px 10px", borderRadius: 999, backgroundColor: "#05070699" }, String(movie.year)),
        ),
      ),
    ),
    div({ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 18, borderTop: "1px solid #ffffff20", color: "#8e9a94", fontSize: 14 },
      div({ display: "flex", gap: 18 }, div({}, "ORIGINAL SATIRE"), div({}, "FICTIONAL RATINGS & COUNTERS")),
      div({ color: "#2bff88", fontWeight: 700 }, "YOUR TASTE, ON TRIAL  ↗"),
    ),
  ));
}

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(path.join(dataDir, "manifest.json"), "utf8")) as ContentManifest;
  const font = await readFile(fontPath);
  await mkdir(outputDir, { recursive: true });
  let generated = 0;
  for (const [id, assetPath] of Object.entries(manifest.movies)) {
    const packPath = path.join(publicDir, assetPath.replace(/^[/\\]+/u, ""));
    const movie = JSON.parse(await readFile(packPath, "utf8")) as MoviePack;
    const svg = await satori(buildOgCard(movie), {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: "Geist", data: font, weight: 400, style: "normal" }],
    });
    const png = new Resvg(svg, {
      fitTo: { mode: "width", value: WIDTH },
      background: "#050706",
      font: { loadSystemFonts: false, fontFiles: [fontPath], defaultFontFamily: "Geist" },
    }).render().asPng();
    await writeFile(path.join(outputDir, `${id}.png`), png);
    generated += 1;
    console.log(`Generated OG image: /og/${id}.png`);
  }
  console.log(`Generated ${generated} Open Graph preview image${generated === 1 ? "" : "s"} (${WIDTH}x${HEIGHT}).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
