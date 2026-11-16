import { afterEach, describe, expect, it, vi } from "vitest";

import { caseSubject } from "@/features/case-panel/subject";
import { findCase } from "@/features/cases/cases";
import { ASSISTANT_CAPS, askAssistant, type AssistantTurn } from "@/features/nova/assistantApi";
import { assistantContextOf, clip, historyOf } from "@/features/nova/assistantContext";
import { isImpactQuestion, novaAnswer, type NovaContext } from "@/features/nova/novaAnswer";
import { parseEvents } from "@/lib/api/apiClient";

const QADIRABAD = findCase("qadirabad");
const CHOCO = findCase("choco");
if (QADIRABAD === undefined || CHOCO === undefined) throw new Error("the demo cases exist");

const none: NovaContext = { subject: undefined, pending: undefined, running: false, mode: "plain" };
const onCase: NovaContext = { ...none, subject: caseSubject(QADIRABAD) };

const sse = (...blocks: [string, unknown][]): string =>
  blocks.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");

const streamed = (body: string, status = 200, type = "text/event-stream"): Response =>
  new Response(body, { status, headers: { "content-type": type } });

const stubFetch = (response: Response) => {
  const fetchMock = vi.fn(() => Promise.resolve(response));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => vi.unstubAllGlobals());

describe("parseEvents (server-sent events)", () => {
  it("reads every whole block and hands back the unfinished one", () => {
    const { events, rest } = parseEvents(
      'event: delta\ndata: {"text":"Hi"}\n\nevent: done\r\ndata: {}\r\n\r\nevent: del',
    );
    expect(events).toEqual([
      { event: "delta", data: { text: "Hi" } },
      { event: "done", data: {} },
    ]);
    expect(rest).toBe("event: del");
  });

  it("keeps a block whose data isn't JSON, without its data", () => {
    expect(parseEvents("event: delta\ndata: {oops\n\n").events).toEqual([
      { event: "delta", data: undefined },
    ]);
  });
});

describe("askAssistant", () => {
  const signal = new AbortController().signal;
  const request = {
    message: "What does this mean?",
    history: [],
    context: { kind: "none" as const },
  };

  it("streams the text and ends whole on done", async () => {
    const fetchMock = stubFetch(
      streamed(
        sse(["delta", { text: "Both channels " }], ["delta", { text: "darkened." }], ["done", {}]),
      ),
    );
    const parts: string[] = [];
    await expect(askAssistant(request, (text) => parts.push(text), signal)).resolves.toEqual({
      kind: "done",
    });
    expect(parts.join("")).toBe("Both channels darkened.");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/assistant");
    expect(JSON.parse(String(init.body))).toEqual(request);
  });

  it("fails on a declined answer, an unavailable server and a cut stream, never throwing", async () => {
    stubFetch(
      streamed(
        sse(["delta", { text: "Partial" }], ["error", { reasonCode: "ASSISTANT_DECLINED" }]),
      ),
    );
    await expect(askAssistant(request, () => undefined, signal)).resolves.toEqual({
      kind: "failed",
      reasonCode: "ASSISTANT_DECLINED",
    });

    stubFetch(
      streamed(
        JSON.stringify({ reasonCode: "ASSISTANT_UNAVAILABLE" }),
        503,
        "application/problem+json",
      ),
    );
    await expect(askAssistant(request, () => undefined, signal)).resolves.toEqual({
      kind: "failed",
      reasonCode: "ASSISTANT_UNAVAILABLE",
    });

    stubFetch(streamed(sse(["delta", { text: "Half an ans" }])));
    await expect(askAssistant(request, () => undefined, signal)).resolves.toMatchObject({
      kind: "failed",
    });
  });
});

describe("what Claude reads about the screen", () => {
  it("summarises a measured case with its question, provenance, facts, limits and sources", () => {
    const context = assistantContextOf(onCase);
    expect(context).toMatchObject({
      kind: "case",
      title: "Qadirabad, Chenab River, Pakistan",
      question: "Did it flood?",
    });
    expect(context.result).toContain("Changed beyond its normal range");
    expect(context.provenance).toContain("OFFLINE measured case");
    expect(context.provenance).toContain("DEMO");
    expect(context.facts?.find(({ label }) => label === "Headline")?.value).toContain(
      "64.3% vs 1.0%",
    );
    expect(context.limitations?.[0]).toBe(QADIRABAD.plainLimit);
    expect(context.sources?.[0]).toContain("https://");
  });

  it("stays inside every cap of the backend", () => {
    const long = "x".repeat(2000);
    const subject = { ...caseSubject(QADIRABAD), name: long, verdictLine: long, plainLimit: long };
    const context = assistantContextOf({ ...onCase, subject });
    expect(context.title?.length).toBeLessThanOrEqual(ASSISTANT_CAPS.short);
    expect(context.result?.length).toBeLessThanOrEqual(ASSISTANT_CAPS.long);
    expect(context.facts?.length).toBeLessThanOrEqual(ASSISTANT_CAPS.facts);
    for (const line of context.limitations ?? [])
      expect(line.length).toBeLessThanOrEqual(ASSISTANT_CAPS.long);
    for (const item of context.facts ?? []) {
      expect(item.label.length).toBeLessThanOrEqual(ASSISTANT_CAPS.short);
      expect(item.value.length).toBeLessThanOrEqual(ASSISTANT_CAPS.long);
    }
  });

  it("says what is on screen when nothing is ready yet", () => {
    expect(assistantContextOf(none).kind).toBe("none");
    expect(assistantContextOf({ ...none, running: true }).result).toContain("still running");
    expect(assistantContextOf({ ...none, pending: CHOCO }).result).toContain(CHOCO.verdictLine);
  });

  it("keeps the last turns that fit, each clipped", () => {
    const turns: AssistantTurn[] = Array.from({ length: 14 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: index === 13 ? "y".repeat(2000) : `turn ${index}`,
    }));
    const kept = historyOf([...turns, { role: "user", content: "  " }]);
    expect(kept).toHaveLength(ASSISTANT_CAPS.turns);
    expect(kept[0]?.content).toBe("turn 4");
    expect(kept.at(-1)?.content.length).toBe(ASSISTANT_CAPS.turn);
    expect(clip("short", 10)).toBe("short");
  });
});

describe("impact questions never reach a model", () => {
  it("are answered No data by the rules", () => {
    expect(isImpactQuestion("How many people were affected?")).toBe(true);
    expect(isImpactQuestion("What does this mean?")).toBe(false);
    expect(novaAnswer("How many people were affected?", onCase).kind).toBe("nodata");
  });
});
