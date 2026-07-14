import type { HypothesisId, PlayerBeliefs } from "@/types/game";

export const MINIMUM_BELIEF_POINTS = 5;

export function createInitialPlayerBeliefs(
  hypothesisIds: readonly HypothesisId[],
): PlayerBeliefs {
  if (hypothesisIds.length !== 3) {
    throw new Error("ONE MORE CONTROL cases require exactly three hypotheses.");
  }

  return {
    [hypothesisIds[0]]: 34,
    [hypothesisIds[1]]: 33,
    [hypothesisIds[2]]: 33,
  };
}

export function rebalanceBeliefPoints(
  current: PlayerBeliefs,
  hypothesisIds: readonly HypothesisId[],
  changedId: HypothesisId,
  requestedPoints: number,
): PlayerBeliefs {
  if (hypothesisIds.length !== 3 || !hypothesisIds.includes(changedId)) {
    throw new Error("Belief rebalancing requires one of three known hypotheses.");
  }

  const maximum = 100 - MINIMUM_BELIEF_POINTS * 2;
  const changedPoints = Math.min(
    maximum,
    Math.max(MINIMUM_BELIEF_POINTS, Math.round(requestedPoints)),
  );
  const otherIds = hypothesisIds.filter((id) => id !== changedId);
  const remaining = 100 - changedPoints;
  const distributable = remaining - MINIMUM_BELIEF_POINTS * 2;
  const firstWeight = Math.max(
    0,
    (current[otherIds[0]] ?? MINIMUM_BELIEF_POINTS) -
      MINIMUM_BELIEF_POINTS,
  );
  const secondWeight = Math.max(
    0,
    (current[otherIds[1]] ?? MINIMUM_BELIEF_POINTS) -
      MINIMUM_BELIEF_POINTS,
  );
  const totalWeight = firstWeight + secondWeight;
  const firstShare =
    totalWeight > 0
      ? Math.round(distributable * (firstWeight / totalWeight))
      : Math.round(distributable / 2);
  const firstPoints = MINIMUM_BELIEF_POINTS + firstShare;
  const secondPoints = remaining - firstPoints;

  return {
    [changedId]: changedPoints,
    [otherIds[0]]: firstPoints,
    [otherIds[1]]: secondPoints,
  };
}
