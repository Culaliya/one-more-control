import "server-only";

const NUMERIC_TOKEN = /[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/g;

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalNumber(value: string | number): string | undefined {
  const parsed =
    typeof value === "number" ? value : Number(value.replaceAll(",", ""));
  if (!Number.isFinite(parsed)) return undefined;
  return Object.is(parsed, -0) ? "0" : String(parsed);
}

function numericTokensInText(value: string): readonly string[] {
  return (value.match(NUMERIC_TOKEN) ?? [])
    .map(canonicalNumber)
    .filter((token): token is string => token !== undefined);
}

/**
 * Collect numbers only from a trusted, server-authored grounding payload.
 * Callers must keep raw player prose out of this value so prompt injection
 * cannot authorize an invented numeric claim.
 */
export function collectGroundedNumericTokens(
  value: unknown,
  tokens = new Set<string>(),
): ReadonlySet<string> {
  if (typeof value === "number") {
    const token = canonicalNumber(value);
    if (token) tokens.add(token);
    return tokens;
  }
  if (typeof value === "string") {
    numericTokensInText(value).forEach((token) => tokens.add(token));
    return tokens;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectGroundedNumericTokens(entry, tokens));
    return tokens;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) =>
      collectGroundedNumericTokens(entry, tokens),
    );
  }
  return tokens;
}

export interface NarrativeGroundingContext {
  knownOutcomeTitles: readonly string[];
  observedOutcomeTitles: readonly string[];
  trustedNumericPayload: unknown;
}

/** Rejects model prose that names an authored-but-unobserved outcome or number. */
export function narrativesAreGrounded(
  narratives: readonly (string | null)[],
  context: NarrativeGroundingContext,
): boolean {
  const combined = normalizeText(narratives.filter(Boolean).join(" "));
  const observedTitles = new Set(
    context.observedOutcomeTitles.map(normalizeText),
  );
  const namesUnobservedOutcome = context.knownOutcomeTitles.some((title) => {
    const normalizedTitle = normalizeText(title);
    return (
      combined.includes(normalizedTitle) && !observedTitles.has(normalizedTitle)
    );
  });
  if (namesUnobservedOutcome) return false;

  const allowedNumbers = collectGroundedNumericTokens(
    context.trustedNumericPayload,
  );
  return numericTokensInText(combined).every((token) =>
    allowedNumbers.has(token),
  );
}
