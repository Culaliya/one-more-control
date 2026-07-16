import { describe, expect, it } from "vitest";
import { finalReasoningReviewSchema } from "../src/lib/ai/schemas";

const validReview = {
  claimSupported: true,
  strongestReasoningMove: "You separated chemistry from readout.",
  unsupportedLeap: null,
  evidencePlayerUnderused: null,
  oneMoreControl: "Orthogonal product quantification",
  summary: "The selected controls jointly support the conclusion.",
};

describe("strict AI response schemas", () => {
  it("accepts a bounded final reasoning review", () => {
    expect(finalReasoningReviewSchema.safeParse(validReview).success).toBe(true);
  });

  it("rejects invented controls and extra numeric claims", () => {
    expect(
      finalReasoningReviewSchema.safeParse({
        ...validReview,
        oneMoreControl: "Invent a new assay",
      }).success,
    ).toBe(false);
    expect(
      finalReasoningReviewSchema.safeParse({
        ...validReview,
        revisedScore: 100,
      }).success,
    ).toBe(false);
  });
});
