import "server-only";

import OpenAI from "openai";
import type {
  ResponseCreateParamsNonStreaming,
  ResponseUsage,
} from "openai/resources/responses/responses";

export interface SanitizedTokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

export interface OpenAIResponseSnapshot {
  outputText: string;
  responseId: string | null;
  tokenUsage: SanitizedTokenUsage | null;
}

export interface ResponsesTransportInput {
  apiKey: string;
  request: ResponseCreateParamsNonStreaming;
  timeoutMs: number;
}

export type ResponsesTransport = (
  input: ResponsesTransportInput,
) => Promise<OpenAIResponseSnapshot>;

function sanitizeTokenUsage(
  usage: ResponseUsage | undefined,
): SanitizedTokenUsage | null {
  if (!usage) return null;
  return {
    inputTokens: usage.input_tokens,
    cachedInputTokens: usage.input_tokens_details.cached_tokens,
    outputTokens: usage.output_tokens,
    reasoningTokens: usage.output_tokens_details.reasoning_tokens,
    totalTokens: usage.total_tokens,
  };
}

export const sendOpenAIResponse: ResponsesTransport = async ({
  apiKey,
  request,
  timeoutMs,
}) => {
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create(request, {
    signal: AbortSignal.timeout(timeoutMs),
  });

  return {
    outputText: response.output_text,
    responseId: response.id,
    tokenUsage: sanitizeTokenUsage(response.usage),
  };
};
