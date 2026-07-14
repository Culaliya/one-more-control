import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import type { ObservationInterpretation, ObservationResponse } from "./schemas";
import {
  observationInterpretationSchema,
  observationJsonSchema,
} from "./schemas";

const OBSERVATION_ASSET = "/cases/fading-signal/initial-observation.png";
const REQUEST_TIMEOUT_MS = 14_000;

const systemPrompt = `You are a careful scientific-image observer inside an educational reasoning game.
Describe only what is visible in the supplied synthetic chart and the supplied case brief.
Do not rank, favor, name, or reveal any candidate hypothesis.
Do not provide wet-lab instructions, protocol steps, or medical advice.
Separate the measured signal from possible mechanism. Keep every string concise enough for a small UI card.`;

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

export async function observeFadingSignal({
  brief,
  fallback,
  assetOrigin,
}: {
  brief: string;
  fallback: ObservationInterpretation;
  assetOrigin?: string;
}): Promise<ObservationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackResponse(fallback);
  }

  try {
    const imageDataUrl = await loadObservationDataUrl(assetOrigin);
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create(
      {
        model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6",
        instructions: systemPrompt,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `CASE BRIEF:\n${brief}\n\nReturn only the requested observation schema. Treat every mechanism as unresolved.`,
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
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );

    if (!response.output_text) {
      return fallbackResponse(fallback);
    }

    const parsedJson: unknown = JSON.parse(response.output_text);
    const parsed = observationInterpretationSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return fallbackResponse(fallback);
    }

    return { ...parsed.data, source: "gpt-5.6" };
  } catch {
    return fallbackResponse(fallback);
  }
}
