import { describe, expect, it } from "vitest";
import {
  bayesianUpdate,
  createUniformDistribution,
  normalizeDistribution,
} from "../src/lib/game/bayes";
import { klDivergenceBits } from "../src/lib/game/entropy";

describe("Bayesian probability utilities", () => {
  it("normalizes values to a sum within 1e-9 of one", () => {
    const normalized = normalizeDistribution({ h1: 2, h2: 3, h3: 5 });
    expect(Object.values(normalized).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
  });

  it("applies Bayes' rule without mutating the prior", () => {
    const prior = createUniformDistribution(["h1", "h2", "h3"]);
    const posterior = bayesianUpdate(prior, { h1: 0.02, h2: 0.02, h3: 0.98 });
    expect(posterior.h3).toBeCloseTo(0.9607843137, 9);
    expect(prior.h3).toBeCloseTo(1 / 3, 12);
  });

  it("returns finite non-negative KL information gain with tiny probabilities", () => {
    const prior = normalizeDistribution({ h1: 1, h2: 1e-20, h3: 1e-20 });
    const posterior = normalizeDistribution({ h1: 0.9, h2: 0.05, h3: 0.05 });
    const information = klDivergenceBits(posterior, prior);
    expect(Number.isFinite(information)).toBe(true);
    expect(information).toBeGreaterThanOrEqual(0);
  });
});

