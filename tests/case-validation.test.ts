import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fadingSignalCase } from "../src/data/cases/public/fading-signal";
import {
  containsForbiddenTruthFields,
  validatePrivateCaseTruth,
  validatePublicCaseDefinition,
} from "../src/lib/game/validation";
import { fadingSignalTruth } from "../src/server/cases/private/fading-signal-truth";

describe("case data boundary", () => {
  it("keeps every public likelihood distribution normalized", () => {
    expect(validatePublicCaseDefinition(fadingSignalCase)).toEqual([]);
    for (const experiment of fadingSignalCase.experiments) {
      for (const distribution of Object.values(experiment.likelihoods)) {
        const values: number[] = Object.values(distribution);
        expect(values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
      }
    }
  });

  it("maps every private authored result to a public possible outcome", () => {
    expect(validatePrivateCaseTruth(fadingSignalCase, fadingSignalTruth)).toEqual([]);
  });

  it("contains no truth or reveal fields in the public case object", () => {
    expect(containsForbiddenTruthFields(fadingSignalCase)).toBe(false);
    expect(JSON.stringify(fadingSignalCase)).not.toContain("optical_interference\":true");
    expect(Object.hasOwn(fadingSignalCase, "debrief")).toBe(false);
  });
});
