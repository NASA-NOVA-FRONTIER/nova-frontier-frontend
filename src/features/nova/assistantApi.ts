import { z } from "zod";

import { apiRequest, apiStream, ApiError, BAD_RESPONSE } from "@/lib/api/apiClient";

/*
 * Nova's answers from Claude (#31), through the backend: GET /assistant says whether Claude answers,
 * POST /assistant streams one answer. The caps match the backend's (constants/assistant.py), so a
 * long conversation is trimmed here instead of being refused there.
 */

export const ASSISTANT_CAPS = {
  message: 800,
  turn: 800,
  turns: 10,
  short: 160,
  long: 400,
  facts: 16,
  limitations: 8,
  sources: 8,
} as const;

export type AssistantTurn = { role: "user" | "assistant"; content: string };
export type ContextFact = { label: string; value: string; source?: string };
export type AssistantContext = {
  kind: "case" | "exploration" | "none";
  title?: string;
  question?: string;
  result?: string;
  dates?: string;
  provenance?: string;
  facts?: ContextFact[];
  limitations?: string[];
  sources?: string[];
};
export type AssistantRequest = {
  message: string;
  history: AssistantTurn[];
  context: AssistantContext;
};

export const statusSchema = z.object({ available: z.boolean(), model: z.string().nullish() });
export type AssistantStatus = z.infer<typeof statusSchema>;

const deltaSchema = z.object({ text: z.string() });
const errorSchema = z.object({ reasonCode: z.string() });

// How an answer ended: whole, or with a reason the chat answers with its rules instead.
export type AssistantOutcome = { kind: "done" } | { kind: "failed"; reasonCode: string };

export const fetchAssistantStatus = (signal: AbortSignal): Promise<AssistantStatus> =>
  apiRequest("/assistant", statusSchema, { signal });

// Streams one answer into onText; a declined or broken answer ends as "failed", never thrown.
export const askAssistant = async (
  request: AssistantRequest,
  onText: (text: string) => void,
  signal: AbortSignal,
): Promise<AssistantOutcome> => {
  let outcome: AssistantOutcome | undefined;
  try {
    await apiStream(
      "/assistant",
      request,
      ({ event, data }) => {
        if (outcome !== undefined) return;
        if (event === "delta") {
          const delta = deltaSchema.safeParse(data);
          if (delta.success) onText(delta.data.text);
        } else if (event === "done") outcome = { kind: "done" };
        else if (event === "error")
          outcome = {
            kind: "failed",
            reasonCode: errorSchema.safeParse(data).data?.reasonCode ?? BAD_RESPONSE,
          };
      },
      { signal },
    );
  } catch (error) {
    if (signal.aborted) throw error;
    return {
      kind: "failed",
      reasonCode: error instanceof ApiError ? error.reasonCode : BAD_RESPONSE,
    };
  }
  // A stream that ends without "done" was cut off: its text may be half an answer.
  return outcome ?? { kind: "failed", reasonCode: BAD_RESPONSE };
};
