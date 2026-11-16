import { useEffect, useRef, useState, type FormEvent } from "react";

import { NOVA_AI } from "@/content/copyV8";
import { Icon } from "@/features/case-panel/icons";
import type { ChartMode } from "@/features/charts/chartTokens";
import {
  ASSISTANT_CAPS,
  askAssistant,
  fetchAssistantStatus,
  type AssistantTurn,
} from "@/features/nova/assistantApi";
import { assistantContextOf, clip, historyOf } from "@/features/nova/assistantContext";
import { NovaGlyph } from "@/features/nova/NovaGlyph";
import { useBubbleLift } from "@/features/nova/useBubbleLift";
import {
  citesOf,
  isImpactQuestion,
  novaAnswer,
  suggestionsFor,
  type Citation,
  type NovaContext,
  type NovaReply,
} from "@/features/nova/novaAnswer";
import { useAsync } from "@/lib/useAsync";
import { ProvenanceChip } from "@/lib/ProvenanceChip";

const THINK_MS = 650;
const REDUCED_THINK_MS = 100;

// A turn is answered by Claude (streamed, then whole) or by the rules, also when Claude failed.
type Message = {
  id: number;
  q: string;
  ai?: { text: string; done: boolean; cites: Citation[] };
  reply?: NovaReply;
  fellBack?: boolean;
};

type NovaChatProps = {
  open: boolean;
  context: NovaContext;
  // What Nova is looking at, e.g. "Qadirabad · Did it flood? · Changed beyond its normal range".
  lookingAt: string;
  mode: ChartMode;
  reduceMotion: boolean;
  onMode: (mode: ChartMode) => void;
  onOpen: (open: boolean) => void;
};

const textOf = (message: Message): string =>
  message.ai?.done === true ? message.ai.text : (message.reply?.text ?? "");

// The bottom-right bubble and its 380 × 540 chat (SPECS §1, §3 "Nova no-data", §6; SPECS-v8 §10).
// Claude answers when the backend has a key (#31); otherwise, and whenever Claude fails, the rules do.
export const NovaChat = ({
  open,
  context,
  lookingAt,
  mode,
  reduceMotion,
  onMode,
  onOpen,
}: NovaChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const lift = useBubbleLift(bubbleRef);
  const nextId = useRef(0);
  // The reply reads what is on screen when it lands, not when the question was asked.
  const latest = useRef(context);
  useEffect(() => {
    latest.current = context;
  });
  const timers = useRef<number[]>([]);
  const streams = useRef<AbortController[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      streams.current.forEach((controller) => controller.abort());
    },
    [],
  );
  const { state: status } = useAsync(fetchAssistantStatus, open ? "assistant" : undefined);
  const claude =
    status?.status === "success" && status.data.available
      ? (status.data.model ?? "Claude")
      : undefined;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const update = (id: number, change: (message: Message) => Message) =>
    setMessages((list) => list.map((item) => (item.id === id ? change(item) : item)));

  const answerWithRules = (id: number, q: string, fellBack: boolean) => {
    const timer = window.setTimeout(
      () =>
        update(id, (item) => ({ id, q: item.q, reply: novaAnswer(q, latest.current), fellBack })),
      fellBack || reduceMotion ? REDUCED_THINK_MS : THINK_MS,
    );
    timers.current.push(timer);
  };

  const answerWithClaude = (id: number, q: string, earlier: Message[]) => {
    const controller = new AbortController();
    streams.current.push(controller);
    const subject = latest.current.subject ?? latest.current.pending;
    const cites = citesOf(subject?.sources ?? []);
    const history: AssistantTurn[] = earlier.flatMap((item) => [
      { role: "user", content: item.q },
      { role: "assistant", content: textOf(item) },
    ]);
    const request = {
      message: clip(q, ASSISTANT_CAPS.message),
      history: historyOf(history),
      context: assistantContextOf(latest.current),
    };
    askAssistant(
      request,
      (text) =>
        update(id, (item) => ({
          ...item,
          ai: { text: (item.ai?.text ?? "") + text, done: false, cites },
        })),
      controller.signal,
    )
      .then((outcome) => {
        if (outcome.kind === "done")
          update(id, (item) => ({ ...item, ai: { text: item.ai?.text ?? "", done: true, cites } }));
        else answerWithRules(id, q, true);
      })
      .catch(() => {
        // Aborted: the chat was closed for good, nothing is left to update.
      });
  };

  const ask = (question: string) => {
    const q = question.trim();
    if (q === "") return;
    const id = nextId.current++;
    const earlier = messages.filter((item) => textOf(item) !== "");
    setDraft("");
    setMessages((list) => [...list, { id, q }]);
    if (claude === undefined || isImpactQuestion(q)) answerWithRules(id, q, false);
    else answerWithClaude(id, q, earlier);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
  };

  const hasSelection =
    context.subject !== undefined || context.pending !== undefined || context.running;
  const writing = messages.some((item) => item.ai !== undefined && !item.ai.done);

  return (
    <>
      {open && (
        <div className="x-nova" role="dialog" aria-label="Ask Nova" data-testid="nova">
          <header className="x-nova__head">
            <NovaGlyph size={32} />
            <span className="x-nova__name">Nova</span>
            {claude === undefined ? (
              <ProvenanceChip kind="demo" source={NOVA_AI.ruleChip} />
            ) : (
              <ProvenanceChip kind="experimental" source={NOVA_AI.aiChip(claude)} />
            )}
            <span className="x-top__fill" />
            <div role="group" aria-label="Answer style" className="x-switch x-switch--small">
              {(["plain", "technical"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => onMode(value)}
                  data-testid={`nova-${value}`}
                >
                  {value === "plain" ? "Plain" : "Technical"}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="x-round"
              onClick={() => onOpen(false)}
              aria-label="Close Nova"
              data-testid="nova-close"
            >
              <Icon name="close" size={13} />
            </button>
          </header>
          <p
            className="x-nova__rule"
            data-testid="nova-rule"
            data-engine={claude === undefined ? "rules" : "claude"}
          >
            {claude === undefined ? NOVA_AI.ruleLine : NOVA_AI.aiLine}
          </p>
          <p className="x-nova__context">Looking at · {lookingAt}</p>
          <div
            className="x-nova__list"
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-busy={writing}
            data-testid="nova-messages"
          >
            {messages.length === 0 && (
              <p className="x-nova__empty">
                I know what's on screen: the place, the question, the passes and the result. I cite
                a source for every answer and say so when there's no data.
              </p>
            )}
            {messages.map((message) => (
              <div key={message.id} className="x-nova__turn">
                <p className="x-nova__q">{message.q}</p>
                {message.ai !== undefined ? (
                  <AiReply text={message.ai.text} done={message.ai.done} cites={message.ai.cites} />
                ) : (
                  <Reply
                    reply={message.reply}
                    fellBack={message.fellBack === true}
                    ai={claude !== undefined}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="x-nova__foot">
            <div className="x-nova__chips">
              {suggestionsFor(hasSelection, context.card !== undefined).map((label) => (
                <button
                  key={label}
                  type="button"
                  className="x-nova__chip"
                  onClick={() => ask(label)}
                  data-testid="nova-suggestion"
                >
                  {label}
                </button>
              ))}
            </div>
            <form className="x-nova__form" onSubmit={submit}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about this place or result"
                aria-label="Ask Nova"
                maxLength={ASSISTANT_CAPS.message}
                data-testid="nova-input"
              />
              <button type="submit" aria-label="Send" data-testid="nova-send">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 19V5M6 11l6-6 6 6" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
      <button
        type="button"
        ref={bubbleRef}
        className="x-nova-bubble"
        style={lift === undefined ? undefined : { bottom: lift }}
        onClick={() => onOpen(!open)}
        aria-label={open ? "Close Nova" : "Ask Nova"}
        aria-expanded={open}
        data-testid="nova-bubble"
      >
        {open ? <Icon name="close" size={20} /> : <NovaGlyph size={56} />}
      </button>
    </>
  );
};

const Cites = ({ cites }: { cites: Citation[] }) => (
  <div className="x-nova__cites">
    {cites.map((cite) => (
      <a key={cite.href} href={cite.href} target="_blank" rel="noopener">
        <span>{cite.n}</span>
        {cite.label}
      </a>
    ))}
  </div>
);

const AiReply = ({ text, done, cites }: { text: string; done: boolean; cites: Citation[] }) => {
  if (text === "")
    return (
      <p className="x-nova__thinking" role="status">
        {NOVA_AI.writing}
      </p>
    );
  return (
    <div className="x-nova__answer" data-testid="nova-ai-answer" data-done={done}>
      <p className="x-nova__ai-text">{text}</p>
      {done && (
        <>
          <p className="x-nova__fields" data-testid="nova-ai-by">
            {NOVA_AI.by}
          </p>
          <Cites cites={cites} />
        </>
      )}
    </div>
  );
};

const Reply = ({
  reply,
  fellBack,
  ai,
}: {
  reply: NovaReply | undefined;
  fellBack: boolean;
  ai: boolean;
}) => {
  if (reply === undefined)
    return (
      <p className="x-nova__thinking" role="status">
        {ai ? NOVA_AI.writing : "Reading the result…"}
      </p>
    );
  const note = fellBack && (
    <p className="x-nova__fields" data-testid="nova-fallback">
      {NOVA_AI.fallback}
    </p>
  );
  if (reply.kind === "nodata")
    return (
      <div className="x-nova__nodata" data-testid="nova-nodata">
        <p className="x-kicker">No data</p>
        <p>{reply.text}</p>
        {note}
      </div>
    );
  return (
    <div className="x-nova__answer" data-testid="nova-answer">
      <p>{reply.text}</p>
      {reply.fields.length > 0 && (
        <p className="x-nova__fields" data-testid="nova-fields">
          On screen · {reply.fields.join(" · ")}
        </p>
      )}
      {note}
      <Cites cites={reply.cites} />
    </div>
  );
};
