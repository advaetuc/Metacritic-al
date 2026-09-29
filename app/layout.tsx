import type { Metadata, Viewport } from "next";
import { bricolage, newsreader } from "@/app/fonts";
import { AmbientBackdrop } from "@/components/backdrop/ambient-backdrop";
import { MotionProvider } from "@/components/providers/motion-provider";
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
      <body>
        <MotionProvider>
          <AmbientBackdrop />
          <div className="app-content">{children}</div>
        </MotionProvider>
      </body>
    </html>
  );
}
