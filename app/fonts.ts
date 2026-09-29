import { Bricolage_Grotesque, Newsreader } from "next/font/google";

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-bricolage",
  fallback: ["Arial", "Helvetica", "sans-serif"],
  display: "swap",
});

export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-newsreader",
  fallback: ["Georgia", "Times New Roman", "serif"],
  display: "swap",
});
