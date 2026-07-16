import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FADING_SIGNAL_HYPOTHESIS_IDS,
  fadingSignalCase,
} from "@/data/cases/public/fading-signal";
import { createInitialGameSession } from "@/lib/game/reducer";
import {
  calculateReasoningFingerprint,
  scoreVerdict,
} from "@/lib/game/scoring";
import { validateVerdictSubmission } from "@/lib/game/validation";
import {
  CaseEngineError,
  replayFadingSignalTrail,
} from "@/server/cases/fading-signal-engine";
import {
  playerRunTrailEntrySchema,
  verdictSchema,
} from "@/server/cases/fading-signal-schemas";
import { reviewFinalReasoningDetailed } from "@/server/ai/final-reasoning-review";
import { consumeAiRequestBudget } from "@/server/ai/request-guard";
import {
  deriveAiRequestGuardKey,
  deriveSafetyIdentifier,
} from "@/server/ai/safety-identifier";
import { recordSanitizedAiTelemetry } from "@/server/ai/telemetry";
import { liveAiRequestsEnabled } from "@/server/ai/live-config";
import { fadingSignalTruth } from "@/server/cases/private/fading-signal-truth";

export const runtime = "nodejs";

const verdictRequestSchema = z
  .object({
    caseId: z.literal("fading-signal"),
    sessionId: z.string().trim().min(8).max(128),
    runHistory: z.array(playerRunTrailEntrySchema).min(2).max(7),
    verdict: verdictSchema,
  })
  .strict();

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

  const parsed = verdictRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Verdict must include two valid results and a complete evidence chain." },
      { status: 400 },
    );
  }

  try {
    const replay = replayFadingSignalTrail(parsed.data.runHistory);
    const session = {
      ...createInitialGameSession(fadingSignalCase, "server-verdict-check"),
      phase: "verdict" as const,
      budgetRemaining: fadingSignalCase.initialBudget - replay.budgetSpent,
      enginePosterior: replay.posterior,
      priorsLocked: true,
      runs: replay.runs,
    };
    const validationIssues = validateVerdictSubmission(
      parsed.data.verdict,
      session,
      FADING_SIGNAL_HYPOTHESIS_IDS,
    );
    if (validationIssues.length > 0) {
      return NextResponse.json(
        { error: validationIssues[0].message },
        { status: 400 },
      );
    }

    const score = scoreVerdict({
      caseDefinition: fadingSignalCase,
      truth: fadingSignalTruth,
      runs: replay.runs,
      verdict: parsed.data.verdict,
    });
    const fingerprint = calculateReasoningFingerprint({
      runs: replay.runs,
      experiments: fadingSignalCase.experiments,
      verdict: parsed.data.verdict,
      enginePosterior: replay.posterior,
    });
    const trueHypothesis = fadingSignalCase.hypotheses.find(
      (hypothesis) => hypothesis.id === fadingSignalTruth.trueHypothesisId,
    );
    if (!trueHypothesis) {
      throw new CaseEngineError("The authored mechanism is unavailable.");
    }
    const safetyIdentifier = deriveSafetyIdentifier(parsed.data.sessionId);
    const guardKey = deriveAiRequestGuardKey({
      route: "verdict",
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
          windowMs: 10 * 60_000,
        }),
    );
    const reasoningReview = await reviewFinalReasoningDetailed({
      caseDefinition: fadingSignalCase,
      truth: fadingSignalTruth,
      runs: replay.runs,
      verdict: parsed.data.verdict,
      score,
      allowModel,
      safetyIdentifier,
    });
    recordSanitizedAiTelemetry(reasoningReview.telemetry);

    return NextResponse.json(
      {
        trueHypothesisId: fadingSignalTruth.trueHypothesisId,
        trueHypothesisTitle: trueHypothesis.title,
        reveal: fadingSignalTruth.debrief,
        enginePosterior: replay.posterior,
        engineConfidence:
          replay.posterior[parsed.data.verdict.hypothesisId] ?? 0,
        playerConfidence: parsed.data.verdict.confidence,
        budgetSpent: replay.budgetSpent,
        score,
        fingerprint,
        reasoningReview: reasoningReview.value,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CaseEngineError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "The verdict could not be scored from the authored case." },
      { status: 500 },
    );
  }
}
