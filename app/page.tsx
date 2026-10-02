import { RoastStudio } from "@/components/studio/roast-studio";

type HomeProps = { searchParams: Promise<{ title?: string | string[] }> };

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const rawTitle = Array.isArray(params.title) ? params.title[0] : params.title;
  const initialTitle = typeof rawTitle === "string"
    ? Array.from(rawTitle.replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ").trim()).slice(0, 80).join("")
    : undefined;
  return <RoastStudio initialTitle={initialTitle} />;
}
