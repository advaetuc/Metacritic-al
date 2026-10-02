import { handleTmdbMovie, methodNotAllowedResponse } from "@/lib/tmdb/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleTmdbMovie(request, id);
}

export function HEAD(): Response {
  return methodNotAllowedResponse();
}

export function OPTIONS(): Response {
  return methodNotAllowedResponse();
}
