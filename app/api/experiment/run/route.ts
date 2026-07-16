import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FADING_SIGNAL_HYPOTHESIS_IDS,
  fadingSignalCase,
  getFadingSignalExperiment,
} from "@/data/cases/public/fading-signal";
import { updatePosteriorForOutcome } from "@/lib/game/bayes";
import { realizedInformationGainBits } from "@/lib/game/entropy";
import { validatePlayerPrediction } from "@/lib/game/validation";
import {
  CaseEngineError,
  predictionMatchesExperiment,
  replayFadingSignalHistory,
  validateExperimentHistory,
} from "@/server/cases/fading-signal-engine";
import {
  fadingSignalExperimentIdSchema,
  playerPredictionSchema,
} from "@/server/cases/fading-signal-schemas";
import { fadingSignalTruth } from "@/server/cases/private/fading-signal-truth";

export const runtime = "nodejs";

const runRequestSchema = z
  .object({
    caseId: z.literal("fading-signal"),
    experimentId: fadingSignalExperimentIdSchema,
    runHistory: z.array(fadingSignalExperimentIdSchema).max(7),
    prediction: playerPredictionSchema,
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

  const parsed = runRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Unknown case, experiment, or invalid prediction payload." },
      { status: 400 },
    );
  }

  const predictionIssues = validatePlayerPrediction(
    parsed.data.prediction,
    FADING_SIGNAL_HYPOTHESIS_IDS,
  );
  if (predictionIssues.length > 0) {
    return NextResponse.json(
      { error: predictionIssues[0].message },
      { status: 400 },
    );
  }

  try {
    const experiment = getFadingSignalExperiment(parsed.data.experimentId);
    if (!experiment) {
      throw new CaseEngineError("Experiment is not part of this case.");
    }

    validateExperimentHistory([
      ...parsed.data.runHistory,
      parsed.data.experimentId,
    ]);
    const replay = replayFadingSignalHistory(parsed.data.runHistory);
    const outcomeId =
      fadingSignalTruth.actualOutcomeByExperiment[parsed.data.experimentId];
    const outcome = experiment.possibleOutcomes.find(
      (candidate) => candidate.id === outcomeId,
    );
    if (!outcome) {
      throw new CaseEngineError("Authored outcome is unavailable.");
    }

    const enginePosterior = updatePosteriorForOutcome(
      replay.posterior,
      experiment,
      outcome.id,
    );
    const informationGainBits = realizedInformationGainBits(
      enginePosterior,
      replay.posterior,
    );
    const predictionUseful = predictionMatchesExperiment(
      experiment.id,
      parsed.data.prediction,
    );
    const budgetSpent = replay.budgetSpent + experiment.cost;

    return NextResponse.json(
      {
        runId: `run-${parsed.data.runHistory.length + 1}`,
        experimentId: experiment.id,
        cost: experiment.cost,
        budgetRemaining: fadingSignalCase.initialBudget - budgetSpent,
        outcome,
        enginePrior: replay.posterior,
        enginePosterior,
        informationGainBits,
        predictionUseful,
        predictionMessage: predictionUseful
          ? parsed.data.prediction.mode === "no_separation"
            ? "Correct: all three mechanisms predicted the same dominant outcome."
            : "Your split matched the experiment's discriminating structure."
          : parsed.data.prediction.mode === "no_separation"
            ? "This experiment had authored expectations that could separate mechanisms."
            : "This split did not match the experiment's authored expectations.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CaseEngineError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "The authored experiment engine could not complete this run." },
      { status: 500 },
    );
  }
}
