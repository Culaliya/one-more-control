import { NextResponse } from "next/server";
import { fadingSignalCase } from "@/data/cases/public/fading-signal";
import { observeFadingSignalDetailed } from "@/lib/ai/observe";
import { observationRequestSchema } from "@/lib/ai/schemas";
import { consumeAiRequestBudget } from "@/server/ai/request-guard";
import {
  deriveAiRequestGuardKey,
  deriveSafetyIdentifier,
} from "@/server/ai/safety-identifier";
import { recordSanitizedAiTelemetry } from "@/server/ai/telemetry";
import { liveAiRequestsEnabled } from "@/server/ai/live-config";

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

  const safetyIdentifier = deriveSafetyIdentifier(parsed.data.sessionId);
  const guardKey = deriveAiRequestGuardKey({
    route: "observe",
    validatedSessionId: parsed.data.sessionId,
    request,
  });
  const allowModel = Boolean(
    liveAiRequestsEnabled() &&
      safetyIdentifier &&
      guardKey &&
      consumeAiRequestBudget({
        key: guardKey,
        limit: 2,
        windowMs: 5 * 60_000,
      }),
  );

  const result = await observeFadingSignalDetailed({
    context:
      "A synthetic enzyme assay compares vehicle with V-17 under matched plate, temperature, enzyme-batch, and substrate conditions. The chart is the only source for visible signal claims.",
    fallback: fadingSignalCase.authoredObservationFallback,
    assetOrigin: new URL(request.url).origin,
    allowModel,
    safetyIdentifier,
  });
  recordSanitizedAiTelemetry(result.telemetry);

  return NextResponse.json(result.value, {
    headers: { "Cache-Control": "no-store" },
  });
}
