import { NextResponse } from "next/server";
import { fadingSignalCase } from "@/data/cases/public/fading-signal";
import { observeFadingSignal } from "@/lib/ai/observe";
import { observationRequestSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = observationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Unknown case or invalid observation request." },
      { status: 400 },
    );
  }

  const result = await observeFadingSignal({
    brief: fadingSignalCase.brief,
    fallback: fadingSignalCase.authoredObservationFallback,
    assetOrigin: new URL(request.url).origin,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
