import "server-only";

interface RequestWindow {
  count: number;
  resetAt: number;
}

const requestWindows = new Map<string, RequestWindow>();
const MAX_TRACKED_KEYS = 500;
export const PROCESS_AI_REQUEST_LIMIT = 40;
export const PROCESS_AI_REQUEST_WINDOW_MS = 60 * 60_000;

function consumeWindow(
  windows: Map<string, RequestWindow>,
  {
    key,
    limit,
    windowMs,
    now,
  }: {
    key: string;
    limit: number;
    windowMs: number;
    now: number;
  },
): boolean {
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > MAX_TRACKED_KEYS) {
      for (const [candidateKey, window] of windows) {
        if (window.resetAt <= now || windows.size > MAX_TRACKED_KEYS) {
          windows.delete(candidateKey);
        }
      }
    }
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function createAiRequestBudgetGuard() {
  const windows = new Map<string, RequestWindow>();
  return {
    consume({
      key,
      limit,
      windowMs,
      now = Date.now(),
    }: {
      key: string;
      limit: number;
      windowMs: number;
      now?: number;
    }): boolean {
      return consumeWindow(windows, { key, limit, windowMs, now });
    },
  };
}

const processRequestBudget = createAiRequestBudgetGuard();

export function consumeAiRequestBudget({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): boolean {
  return consumeWindow(requestWindows, { key, limit, windowMs, now });
}

/**
 * Defense-in-depth only: this ceiling is local to one Node.js process and is
 * intentionally not presented as a distributed hosting-platform rate limit.
 */
export function consumeProcessWideAiRequestBudget(
  now = Date.now(),
): boolean {
  return processRequestBudget.consume({
    key: "all-openai-transports",
    limit: PROCESS_AI_REQUEST_LIMIT,
    windowMs: PROCESS_AI_REQUEST_WINDOW_MS,
    now,
  });
}
