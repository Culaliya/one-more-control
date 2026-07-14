import { describe, expect, it } from "vitest";
import {
  createInitialPlayerBeliefs,
  rebalanceBeliefPoints,
} from "../src/lib/game/beliefs";

const ids = ["h1", "h2", "h3"] as const;

describe("player belief rebalancing", () => {
  it("creates an integer neutral distribution totaling 100", () => {
    const beliefs = createInitialPlayerBeliefs(ids);
    expect(Object.values(beliefs).reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(Object.values(beliefs).every((value) => value >= 5)).toBe(true);
  });

  it.each([5, 37, 90, -10, 150])(
    "keeps the total and floor when a slider requests %i",
    (requested) => {
      const beliefs = rebalanceBeliefPoints(
        { h1: 34, h2: 33, h3: 33 },
        ids,
        "h1",
        requested,
      );
      expect(Object.values(beliefs).reduce((sum, value) => sum + value, 0)).toBe(100);
      expect(Object.values(beliefs).every((value) => value >= 5)).toBe(true);
      expect(Object.values(beliefs).every(Number.isInteger)).toBe(true);
    },
  );
});
