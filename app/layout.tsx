import type { Metadata, Viewport } from "next";
import { bricolage, newsreader } from "@/app/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metacritic-al — Your taste, on trial",
  description: "Name a movie. Get roasted.",
};

export const viewport: Viewport = {
  themeColor: "#050706",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
