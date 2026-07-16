import "server-only";

export function liveAiRequestsEnabled(
  value = process.env.OPENAI_LIVE_REQUESTS_ENABLED,
): boolean {
  return value === "1";
}
