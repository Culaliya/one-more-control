import "server-only";

import { createHmac } from "node:crypto";

const SAFETY_IDENTIFIER_PREFIX = "omc_";
const SAFETY_IDENTIFIER_HASH_LENGTH = 60;

function trustedClientAddress(request: Request): string | undefined {
  const cloudflareRay = request.headers.get("cf-ray")?.trim();
  const cloudflareAddress = request.headers.get("cf-connecting-ip")?.trim();
  if (!cloudflareRay || !cloudflareAddress) return undefined;
  return cloudflareAddress.slice(0, 128);
}

function hmacDigest(value: string, pepper: string): string {
  return createHmac("sha256", pepper).update(value).digest("hex");
}

export function deriveSafetyIdentifier(
  validatedSessionId: string,
  pepper = process.env.OPENAI_SAFETY_PEPPER,
): string | undefined {
  if (!pepper) return undefined;

  const digest = hmacDigest(
    `one-more-control:session:${validatedSessionId}`,
    pepper,
  ).slice(0, SAFETY_IDENTIFIER_HASH_LENGTH);
  return `${SAFETY_IDENTIFIER_PREFIX}${digest}`;
}

export function deriveAiRequestGuardKey({
  route,
  validatedSessionId,
  request,
  pepper = process.env.OPENAI_SAFETY_PEPPER,
}: {
  route: "observe" | "verdict";
  validatedSessionId: string;
  request: Request;
  pepper?: string;
}): string | undefined {
  if (!pepper) return undefined;

  const sessionFingerprint = hmacDigest(
    `one-more-control:guard-session:${validatedSessionId}`,
    pepper,
  );
  const clientAddress = trustedClientAddress(request);
  const requestFingerprint = clientAddress
    ? hmacDigest(`one-more-control:trusted-client:${clientAddress}`, pepper)
    : "trusted-client-unavailable";
  return `${route}:${sessionFingerprint}:${requestFingerprint}`;
}
