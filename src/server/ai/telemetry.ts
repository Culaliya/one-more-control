import "server-only";

import { createHash } from "node:crypto";
import type { SanitizedTokenUsage } from "./openai-responses";

export interface SanitizedAiTelemetry {
  route: "/api/ai/observe" | "/api/verdict/submit";
  source: "gpt-5.6" | "fallback";
  requestedModelAlias: "gpt-5.6";
  elapsedMilliseconds: number;
  openAiResponseId: string | null;
  tokenUsage: SanitizedTokenUsage | null;
  schemaValidation: boolean;
  semanticInvariant: boolean;
}

const TELEMETRY_PREFIX = "OMC_AI_SMOKE ";

export function telemetryForConsole(telemetry: SanitizedAiTelemetry) {
  const { openAiResponseId, ...safeTelemetry } = telemetry;
  return {
    ...safeTelemetry,
    openAiResponseIdHash: openAiResponseId
      ? createHash("sha256").update(openAiResponseId).digest("hex").slice(0, 16)
      : null,
  };
}

export function recordSanitizedAiTelemetry(
  telemetry: SanitizedAiTelemetry,
): void {
  if (process.env.OPENAI_SMOKE_OBSERVABILITY !== "1") return;
  console.info(`${TELEMETRY_PREFIX}${JSON.stringify(telemetryForConsole(telemetry))}`);
}
