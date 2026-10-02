import { handleTmdbImage, methodNotAllowedResponse } from "@/lib/tmdb/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  return handleTmdbImage(request, path);
}

export function HEAD(): Response {
  return methodNotAllowedResponse();
}

export function OPTIONS(): Response {
  return methodNotAllowedResponse();
}
