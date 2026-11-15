import { z } from "zod";

import { STEP_8 } from "@/content/copyV8";
import { apiRequest } from "@/lib/api/apiClient";

/*
 * Backend #2: GET /api/v1/limits → how many new live analyses are left today, for the app and for
 * this client, and when they reset (UTC). Cache hits and known cases never count. Decision 8: no
 * number is ever hardcoded here; until the endpoint exists the quota line stays hidden.
 */
export const limitsSchema = z.object({
  remainingApp: z.number().int().nonnegative().nullable(),
  remainingClient: z.number().int().nonnegative().nullable(),
  resetsAt: z.string().nullable().optional(),
});

export type Limits = z.infer<typeof limitsSchema>;

export const fetchLimits = (signal: AbortSignal): Promise<Limits> =>
  apiRequest("/limits", limitsSchema, { signal });

// SPECS-v8 §8: the counter shows only at 3 or fewer left, or when used up.
export const QUOTA_LINE_AT = 3;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

export type Quota =
  { kind: "hidden" } | { kind: "low"; remaining: number } | { kind: "out"; resetsAt: Date };

// The tighter of the two caps is the one that stops the next analysis.
const remainingOf = (limits: Limits): number | undefined => {
  const known = [limits.remainingApp, limits.remainingClient].filter(
    (value): value is number => value !== null,
  );
  return known.length === 0 ? undefined : Math.min(...known);
};

// The backend's reset time, or the next 00:00 UTC (SPECS-v8 §8) when it gives none.
export const resetOf = (resetsAt: string | null | undefined, now: Date): Date => {
  const given = resetsAt == null ? Number.NaN : Date.parse(resetsAt);
  if (Number.isFinite(given) && given > now.getTime()) return new Date(given);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
};

export const quotaOf = (limits: Limits | undefined, now: Date): Quota => {
  if (limits === undefined) return { kind: "hidden" };
  const remaining = remainingOf(limits);
  if (remaining === undefined || remaining > QUOTA_LINE_AT) return { kind: "hidden" };
  if (remaining === 0) return { kind: "out", resetsAt: resetOf(limits.resetsAt, now) };
  return { kind: "low", remaining };
};

// "00:00" and "6 h 12 min" for the used-up body.
export const resetText = (resetsAt: Date, now: Date): { at: string; wait: string } => {
  const left = Math.max(0, resetsAt.getTime() - now.getTime());
  const hours = Math.floor(left / HOUR_MS);
  const minutes = Math.floor((left % HOUR_MS) / MINUTE_MS);
  const at = `${String(resetsAt.getUTCHours()).padStart(2, "0")}:${String(resetsAt.getUTCMinutes()).padStart(2, "0")}`;
  return { at, wait: STEP_8.resetIn(hours, minutes) };
};
