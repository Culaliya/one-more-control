import { z } from "zod";

const conciseString = z.string().trim().min(1).max(180);

export const observationInterpretationSchema = z
  .object({
    observation: conciseString,
    measuredSignal: conciseString,
    conditionsCompared: z.array(conciseString).min(2).max(4),
    visibleControls: z.array(conciseString).min(1).max(6),
    missingControls: z.array(conciseString).min(1).max(5),
    ambiguity: conciseString,
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type ObservationInterpretation = z.infer<
  typeof observationInterpretationSchema
>;

export const observationRequestSchema = z
  .object({
    caseId: z.literal("fading-signal"),
  })
  .strict();

export const observationResponseSchema = observationInterpretationSchema.extend({
  source: z.enum(["gpt-5.6", "fallback"]),
});

export type ObservationResponse = z.infer<typeof observationResponseSchema>;

export const observationJsonSchema = {
  type: "object",
  properties: {
    observation: { type: "string", minLength: 1, maxLength: 180 },
    measuredSignal: { type: "string", minLength: 1, maxLength: 180 },
    conditionsCompared: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string", minLength: 1, maxLength: 180 },
    },
    visibleControls: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "string", minLength: 1, maxLength: 180 },
    },
    missingControls: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string", minLength: 1, maxLength: 180 },
    },
    ambiguity: { type: "string", minLength: 1, maxLength: 180 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "observation",
    "measuredSignal",
    "conditionsCompared",
    "visibleControls",
    "missingControls",
    "ambiguity",
    "confidence",
  ],
  additionalProperties: false,
} as const;
