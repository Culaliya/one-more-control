import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ObservationInterpretation, ObservationResponse } from "./schemas";
import {
  observationInterpretationSchema,
  observationJsonSchema,
} from "./schemas";
import {
  sendOpenAIResponse,
  type OpenAIResponseSnapshot,
  type ResponsesTransport,
} from "@/server/ai/openai-responses";
import {
  isCompletePlayerFacingSentence,
  isSafePlayerFacingLabel,
} from "@/server/ai/player-facing-copy";
import type { SanitizedAiTelemetry } from "@/server/ai/telemetry";
import { consumeProcessWideAiRequestBudget } from "@/server/ai/request-guard";

const OBSERVATION_ASSET = "/cases/fading-signal/initial-observation.png";
const MODEL = "gpt-5.6";
const REQUEST_TIMEOUT_MS = 14_000;

const exactExperimentTitles = [
  "Repeat the fluorescent assay",
  "Same-channel dose response",
  "Measure soluble enzyme abundance",
  "Post-reaction spike-in",
  "Orthogonal product quantification",
  "Substrate titration, same readout",
].map(normalizeAuthoredPhrase);

const exactHypothesisNames = [
  "competitive catalytic inhibition",
  "competitive inhibition",
  "enzyme loss",
  "optical interference",
];

const systemPrompt = `You are a careful scientific-image observer inside an educational reasoning game.
Describe only what is visible in the supplied synthetic chart and the supplied case brief.
Do not rank, favor, name, or reveal any candidate hypothesis.
Do not provide wet-lab instructions, protocol steps, or medical advice.
Separate the measured signal from possible mechanism. Write only in English.
Keep observation, measuredSignal, and ambiguity under 160 characters each and end each with a complete sentence.
Keep list entries under 160 characters as short English noun phrases.
For missingControls, name broad measurement or timing dimensions. Never copy an experiment-card title or recommend one exact test.
Do not restate every chart label when a shorter observation preserves the ambiguity.`;

async function loadObservationDataUrl(assetOrigin?: string): Promise<string> {
  try {
    const imagePath = path.join(
      process.cwd(),
      "public",
      "cases",
      "fading-signal",
      "initial-observation.png",
    );
    const bytes = await readFile(imagePath);
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch (fileError) {
    if (!assetOrigin) {
      throw fileError;
    }

    const response = await fetch(new URL(OBSERVATION_ASSET, assetOrigin));
    if (!response.ok) {
      throw new Error(`Observation asset returned ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:image/png;base64,${bytes.toString("base64")}`;
  }
}

function fallbackResponse(
  fallback: ObservationInterpretation,
): ObservationResponse {
  return { ...fallback, source: "fallback" };
}

export interface ObservationExecution {
  value: ObservationResponse;
  telemetry: SanitizedAiTelemetry;
}

export interface ObservationServiceInput {
  context: string;
  fallback: ObservationInterpretation;
  assetOrigin?: string;
  allowModel?: boolean;
  safetyIdentifier?: string;
}

interface ObservationServiceDependencies {
  transport?: ResponsesTransport;
  readApiKey?: () => string | undefined;
  readLiveRequestsEnabled?: () => boolean;
  now?: () => number;
}

function normalizeAuthoredPhrase(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function observationPassesSemanticInvariants(
  observation: ObservationInterpretation,
): boolean {
  const combinedText = normalizeAuthoredPhrase([
    observation.observation,
    observation.measuredSignal,
    observation.ambiguity,
    ...observation.conditionsCompared,
    ...observation.visibleControls,
    ...observation.missingControls,
  ].join(" "));
  const visibleSignalNamed = /fluorescen|signal|slope|trace/.test(
    `${observation.observation} ${observation.measuredSignal}`.toLowerCase(),
  );
  const ranksMechanisms = /\b(more|most|less|least) likely\b|\bfavou?rs?\b|\branks?\b/.test(
    combinedText,
  );
  const namesHypothesis = exactHypothesisNames.some((name) =>
    combinedText.includes(name),
  );
  const copiesExperimentTitle = exactExperimentTitles.some((title) =>
    combinedText.includes(title),
  );
  const includesProtocolInstruction =
    /\b(pipett(?:e|ing)|incubat(?:e|ion)|centrifug(?:e|ation)|microliters?|mix for \d|add \d)\b|µl|\b\d+\s?°c\b/.test(
      combinedText,
    );
  const narrativeCopyIsSafe = [
    observation.observation,
    observation.measuredSignal,
    observation.ambiguity,
  ].every(isCompletePlayerFacingSentence);
  const listCopyIsSafe = [
    ...observation.conditionsCompared,
    ...observation.visibleControls,
    ...observation.missingControls,
  ].every(isSafePlayerFacingLabel);

  return (
    visibleSignalNamed &&
    narrativeCopyIsSafe &&
    listCopyIsSafe &&
    !ranksMechanisms &&
    !namesHypothesis &&
    !copiesExperimentTitle &&
    !includesProtocolInstruction
  );
}

function createTelemetry({
  startedAt,
  now,
  source,
  snapshot,
  schemaValidation,
  semanticInvariant,
}: {
  startedAt: number;
  now: () => number;
  source: "gpt-5.6" | "fallback";
  snapshot?: OpenAIResponseSnapshot;
  schemaValidation: boolean;
  semanticInvariant: boolean;
}): SanitizedAiTelemetry {
  return {
    route: "/api/ai/observe",
    source,
    requestedModelAlias: MODEL,
    elapsedMilliseconds: Math.max(0, now() - startedAt),
    openAiResponseId: snapshot?.responseId ?? null,
    tokenUsage: snapshot?.tokenUsage ?? null,
    schemaValidation,
    semanticInvariant,
  };
}

async function requestObservation(
  input: ObservationServiceInput,
  {
    transport,
    readApiKey,
    readLiveRequestsEnabled,
    now,
  }: Required<ObservationServiceDependencies>,
): Promise<ObservationExecution> {
  const { context, fallback, assetOrigin, safetyIdentifier } = input;
  const startedAt = now();
  const authoredFallback = fallbackResponse(fallback);
  const apiKey = readApiKey();
  if (
    !apiKey ||
    !safetyIdentifier ||
    input.allowModel === false ||
    !readLiveRequestsEnabled()
  ) {
    return {
      value: authoredFallback,
      telemetry: createTelemetry({
        startedAt,
        now,
        source: "fallback",
        schemaValidation: true,
        semanticInvariant: true,
      }),
    };
  }

  let snapshot: OpenAIResponseSnapshot | undefined;
  try {
    if (!consumeProcessWideAiRequestBudget()) {
      return {
        value: authoredFallback,
        telemetry: createTelemetry({
          startedAt,
          now,
          source: "fallback",
          schemaValidation: true,
          semanticInvariant: true,
        }),
      };
    }
    const imageDataUrl = await loadObservationDataUrl(assetOrigin);
    snapshot = await transport({
      apiKey,
      timeoutMs: REQUEST_TIMEOUT_MS,
      request: {
        model: MODEL,
        reasoning: { effort: "low" },
        safety_identifier: safetyIdentifier,
        store: false,
        max_output_tokens: 450,
        instructions: systemPrompt,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `PUBLIC CONTEXT:\n${context}\n\nReturn only the requested observation schema. Treat every mechanism as unresolved.`,
              },
              {
                type: "input_image",
                image_url: imageDataUrl,
                detail: "high",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "synthetic_observation_interpretation",
            strict: true,
            schema: observationJsonSchema,
          },
        },
      },
    });

    if (!snapshot.outputText) {
      return {
        value: authoredFallback,
        telemetry: createTelemetry({
          startedAt,
          now,
          source: "fallback",
          snapshot,
          schemaValidation: false,
          semanticInvariant: false,
        }),
      };
    }

    const parsedJson: unknown = JSON.parse(snapshot.outputText);
    const parsed = observationInterpretationSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return {
        value: authoredFallback,
        telemetry: createTelemetry({
          startedAt,
          now,
          source: "fallback",
          snapshot,
          schemaValidation: false,
          semanticInvariant: false,
        }),
      };
    }

    const semanticInvariant = observationPassesSemanticInvariants(parsed.data);
    if (!semanticInvariant) {
      return {
        value: authoredFallback,
        telemetry: createTelemetry({
          startedAt,
          now,
          source: "fallback",
          snapshot,
          schemaValidation: true,
          semanticInvariant: false,
        }),
      };
    }

    return {
      value: { ...parsed.data, source: "gpt-5.6" },
      telemetry: createTelemetry({
        startedAt,
        now,
        source: "gpt-5.6",
        snapshot,
        schemaValidation: true,
        semanticInvariant: true,
      }),
    };
  } catch {
    return {
      value: authoredFallback,
      telemetry: createTelemetry({
        startedAt,
        now,
        source: "fallback",
        snapshot,
        schemaValidation: false,
        semanticInvariant: false,
      }),
    };
  }
}

export function createObservationService(
  dependencies: ObservationServiceDependencies = {},
) {
  const resolvedDependencies: Required<ObservationServiceDependencies> = {
    transport: dependencies.transport ?? sendOpenAIResponse,
    readApiKey: dependencies.readApiKey ?? (() => process.env.OPENAI_API_KEY),
    readLiveRequestsEnabled:
      dependencies.readLiveRequestsEnabled ??
      (() => process.env.OPENAI_LIVE_REQUESTS_ENABLED === "1"),
    now: dependencies.now ?? Date.now,
  };
  let cachedSuccess: ObservationExecution | undefined;
  let pending: Promise<ObservationExecution> | undefined;

  return {
    run(input: ObservationServiceInput): Promise<ObservationExecution> {
      const modelEligible = Boolean(
        input.allowModel !== false &&
          input.safetyIdentifier &&
          resolvedDependencies.readApiKey() &&
          resolvedDependencies.readLiveRequestsEnabled(),
      );
      if (!modelEligible) {
        return requestObservation(input, resolvedDependencies);
      }
      if (cachedSuccess) return Promise.resolve(cachedSuccess);
      if (pending) return pending;

      const current = (async () => {
        try {
          const result = await requestObservation(input, resolvedDependencies);
          if (result.value.source === "gpt-5.6") cachedSuccess = result;
          return result;
        } finally {
          pending = undefined;
        }
      })();
      pending = current;
      return current;
    },
  };
}

const observationService = createObservationService();

export function observeFadingSignalDetailed(
  input: ObservationServiceInput,
): Promise<ObservationExecution> {
  return observationService.run(input);
}

export async function observeFadingSignal(
  input: ObservationServiceInput,
): Promise<ObservationResponse> {
  return (await observeFadingSignalDetailed(input)).value;
}
