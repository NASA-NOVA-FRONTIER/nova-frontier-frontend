import type { Subject } from "@/features/case-panel/subject";
import { VERDICT } from "@/features/case-panel/verdicts";
import { findLens, type Case, type Source } from "@/features/cases/cases";
import type { ChartMode } from "@/features/charts/chartTokens";
import {
  ASSISTANT_CAPS,
  type AssistantContext,
  type AssistantTurn,
  type ContextFact,
} from "@/features/nova/assistantApi";
import type { NovaContext } from "@/features/nova/novaAnswer";
import type { CardFacts } from "@/features/nova/novaFacts";
import { formatDay } from "@/features/timeline/timelineLayout";

/*
 * What Claude reads about the screen (#31): only what the panel, the lens card and the sheet show,
 * with their sources. The backend wraps it as data, never instructions; here it is just trimmed to
 * the backend's caps so no request is refused for its size.
 */

export const clip = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

const fact = (label: string, value: string, source?: string): ContextFact => ({
  label: clip(label, ASSISTANT_CAPS.short),
  value: clip(value, ASSISTANT_CAPS.long),
  ...(source !== undefined && { source: clip(source, ASSISTANT_CAPS.long) }),
});

const sourcesOf = (sources: Source[]): string[] =>
  sources
    .slice(0, ASSISTANT_CAPS.sources)
    .map((source) => clip(`${source.label} — ${source.href}`, ASSISTANT_CAPS.long));

const cardFacts = (card: CardFacts): ContextFact[] =>
  [
    card.verdict,
    card.headline,
    card.rule,
    card.pixel,
    card.surroundings,
    card.fire,
    card.whyTwo,
  ].flatMap((item) => (item === undefined ? [] : [fact(item.field, item.text)]));

const provenanceOf = (subject: Subject): string => {
  if (subject.demo) return "DEMO: the service marked this answer as a synthetic stand-in.";
  if (subject.kind === "live")
    return "REAL: computed just now from NISAR L-band scenes by the radar service.";
  const chart = subject.passes === undefined ? "" : " The point chart and its pass dates are DEMO.";
  return `OFFLINE measured case: its numbers are REAL, copied from the model's published report.${chart}`;
};

const subjectFacts = (subject: Subject, card: CardFacts | undefined): ContextFact[] => [
  ...(card === undefined ? [] : cardFacts(card)),
  ...(subject.stat === undefined
    ? []
    : [fact("Headline", `${subject.stat} ${subject.statLine ?? ""}`)]),
  ...(subject.normalRange?.channels ?? []).map((channel) =>
    fact(
      `${channel.channel} change`,
      `${channel.delta.toFixed(1)} dB against a normal range of ±${channel.halfWidth.toFixed(1)} dB from ${subject.normalRange?.baselinePasses ?? 0} earlier passes`,
    ),
  ),
  ...(subject.groups[0]?.rows ?? []).map((row) =>
    fact(row.label, `${row.k.toLocaleString("en-US")} of ${row.n.toLocaleString("en-US")} cells`),
  ),
  ...(subject.insar?.facts ?? []).map((item) => fact(item.k, item.v)),
  ...(subject.insar === undefined ? [] : [fact("Displacement", subject.insar.displacement)]),
  ...(subject.fireContext?.facts ?? []).map((item) => fact(`Fire context · ${item.k}`, item.v)),
  ...subject.quality.map((item) => fact(item.k, `${item.v} — ${item.why}`)),
  ...(subject.witness === undefined
    ? []
    : [fact("Second witness", `${subject.witness.label}. ${subject.witness.note}`)]),
];

const subjectContext = (
  subject: Subject,
  card: CardFacts | undefined,
  mode: ChartMode,
): AssistantContext => {
  const lens = findLens(subject.lens);
  const limits = [
    subject.plainLimit,
    subject.techLimit,
    subject.reason,
    subject.alternatives.length > 0
      ? `Other things that change radar like this: ${subject.alternatives.join(", ")}.`
      : undefined,
  ].filter((item): item is string => item !== undefined && item.trim() !== "");
  return {
    kind: subject.kind === "case" ? "case" : "exploration",
    title: clip(`${subject.name}, ${subject.place}`, ASSISTANT_CAPS.short),
    question: clip(card?.question ?? lens?.chip ?? "", ASSISTANT_CAPS.short),
    result: clip(`${VERDICT[subject.verdict].label}. ${subject.verdictLine}`, ASSISTANT_CAPS.long),
    dates: clip(
      subject.target === undefined ? subject.when : `Target pass ${formatDay(subject.target)}`,
      ASSISTANT_CAPS.short,
    ),
    provenance: provenanceOf(subject),
    facts: [
      fact("Reading level", mode === "plain" ? "Plain" : "Technical"),
      ...subjectFacts(subject, card),
    ].slice(0, ASSISTANT_CAPS.facts),
    limitations: limits
      .slice(0, ASSISTANT_CAPS.limitations)
      .map((line) => clip(line, ASSISTANT_CAPS.long)),
    sources: sourcesOf(subject.sources),
  };
};

const pendingContext = (item: Case): AssistantContext => ({
  kind: "case",
  title: clip(`${item.name}, ${item.place}`, ASSISTANT_CAPS.short),
  result: clip([item.verdictLine, item.reason].filter(Boolean).join(" "), ASSISTANT_CAPS.long),
  provenance: "Event context with a measured coherence only: no case layer or result yet.",
  facts: [fact("Headline", `${item.stat} ${item.statLine}`)],
  limitations: [clip(item.plainLimit, ASSISTANT_CAPS.long)],
  sources: sourcesOf(item.sources),
});

export const assistantContextOf = (context: NovaContext): AssistantContext => {
  if (context.pending !== undefined) return pendingContext(context.pending);
  if (context.running)
    return {
      kind: "exploration",
      result: "The radar job is still running; there is no result yet.",
    };
  if (context.subject !== undefined)
    return subjectContext(context.subject, context.card, context.mode);
  return {
    kind: "none",
    result: "Nothing is selected: the globe shows the NISAR frames and the measured cases.",
  };
};

// The last turns that fit the backend's caps, oldest first, each clipped.
export const historyOf = (turns: AssistantTurn[]): AssistantTurn[] =>
  turns
    .filter((turn) => turn.content.trim() !== "")
    .slice(-ASSISTANT_CAPS.turns)
    .map((turn) => ({ role: turn.role, content: clip(turn.content, ASSISTANT_CAPS.turn) }));
