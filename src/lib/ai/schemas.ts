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
    sessionId: z.string().trim().min(8).max(128),
  })
  .strict();

export const observationResponseSchema = observationInterpretationSchema.extend({
  source: z.enum(["gpt-5.6", "fallback"]),
});

export type ObservationResponse = z.infer<typeof observationResponseSchema>;

const authoredExperimentTitleSchema = z.enum([
  "Repeat the fluorescent assay",
  "Same-channel dose response",
  "Measure soluble enzyme abundance",
  "Post-reaction spike-in",
  "Orthogonal product quantification",
  "Substrate titration, same readout",
]);

export const finalReasoningReviewSchema = z
  .object({
    claimSupported: z.boolean(),
    strongestReasoningMove: conciseString,
    unsupportedLeap: conciseString.nullable(),
    evidencePlayerUnderused: conciseString.nullable(),
    oneMoreControl: authoredExperimentTitleSchema,
    summary: conciseString,
  })
  .strict();

export const finalReasoningReviewJsonSchema = {
  type: "object",
  properties: {
    claimSupported: { type: "boolean" },
    strongestReasoningMove: { type: "string", minLength: 1, maxLength: 180 },
    unsupportedLeap: {
      anyOf: [
        { type: "string", minLength: 1, maxLength: 180 },
        { type: "null" },
      ],
    },
    evidencePlayerUnderused: {
      anyOf: [
        { type: "string", minLength: 1, maxLength: 180 },
        { type: "null" },
      ],
    },
    oneMoreControl: {
      type: "string",
      enum: [
        "Repeat the fluorescent assay",
        "Same-channel dose response",
        "Measure soluble enzyme abundance",
        "Post-reaction spike-in",
        "Orthogonal product quantification",
        "Substrate titration, same readout",
      ],
    },
    summary: { type: "string", minLength: 1, maxLength: 180 },
  },
  required: [
    "claimSupported",
    "strongestReasoningMove",
    "unsupportedLeap",
    "evidencePlayerUnderused",
    "oneMoreControl",
    "summary",
  ],
  additionalProperties: false,
} as const;

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
