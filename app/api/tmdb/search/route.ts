import { handleTmdbSearch, methodNotAllowedResponse } from "@/lib/tmdb/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleTmdbSearch(request);
}

export function HEAD(): Response {
  return methodNotAllowedResponse();
}

export function OPTIONS(): Response {
  return methodNotAllowedResponse();
}
