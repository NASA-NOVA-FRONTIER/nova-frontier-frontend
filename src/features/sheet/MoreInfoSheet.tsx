import { useState } from "react";

import { CASE_LIMITATIONS } from "@/content/copyV8";
import { Icon } from "@/features/case-panel/icons";
import { Prov } from "@/features/case-panel/Prov";
import type { Subject } from "@/features/case-panel/subject";
import { VerdictGlyph } from "@/features/case-panel/Verdict";
import { bandSentence, SOURCE, VERDICT, VERDICT_ORDER } from "@/features/case-panel/verdicts";
import { NormalRangeCard } from "@/features/case-panel/NormalRangeCard";
import { FireContextCard } from "@/features/case-panel/FireContextCard";
import { findLens, OPTICAL, type Crops } from "@/features/cases/cases";
import { BandChart } from "@/features/charts/BandChart";
import { ContrastBars } from "@/features/charts/ContrastBars";
import { MatchedWhisker } from "@/features/charts/MatchedWhisker";
import { LandslidePanel, LandslideTable } from "@/features/landslide/LandslidePanel";
import { EMPTIES_LINE, jobSteps } from "@/features/live/liveQuestion";
import { NovaGlyph } from "@/features/nova/NovaGlyph";
import { CompareSplit } from "@/features/sheet/CompareSplit";
import { LiveSciencePanel } from "@/features/sheet/LiveSciencePanel";
import { PublishedFiles, RegionalAnalysisPanel } from "@/features/sheet/RegionalAnalysisPanel";
import { canRunRegional } from "@/features/sheet/regionalRuns";
import type { ExplorationView } from "@/features/explore/exploreSchemas";
import { formatDay } from "@/features/timeline/timelineLayout";

import { tr } from "@/i18n/translate";
import { localized } from "@/i18n/localized";
const CHANGE_RAMP = "linear-gradient(90deg,#2f6db5,#f2f0eb,#c2473a)";
const VIRIDIS = "linear-gradient(90deg,#440154,#3b528b,#21918c,#5ec962,#fde725)";

const OPTICAL_LEGEND = localized([
  { color: OPTICAL.newWater, label: "New open water" },
  { color: OPTICAL.stableWater, label: "Stable open water" },
  { color: OPTICAL.dry, label: "Stable non-water" },
  { color: OPTICAL.loss, label: "Open-water loss" },
  { color: OPTICAL.mixed, label: "Mixed or partial" },
  { color: OPTICAL.unsupported, label: "Unsupported" },
]);

// The flood cases' four report crops; a case without an optical stage has none of these tiles.
const reportCrops = (crops: Crops | undefined) =>
  crops?.optical === undefined || crops.signature === undefined
    ? undefined
    : { ...crops, optical: crops.optical, signature: crops.signature };

type SheetView = "plain" | "regional";

type SheetProps = {
  subject: Subject;
  onClose: () => void;
  onAskNova?: () => void;
  exploration?: ExplorationView | undefined;
  isArea?: boolean;
};

// "More information": the five beats in full, with how it was computed, quality and sources.
export const MoreInfoSheet = ({ subject, onClose, onAskNova, exploration, isArea }: SheetProps) => {
  const lens = findLens(subject.lens);
  // The sheet's own views; Nova keeps its Plain / Technical switch apart.
  const [view, setView] = useState<SheetView>("plain");
  const regionalId =
    subject.kind === "live" && exploration !== undefined && canRunRegional(exploration)
      ? exploration.id
      : undefined;
  const regional = view === "regional" && regionalId !== undefined;
  const scored = subject.lens !== "insar" && subject.verdict !== "measured";
  const products = subject.kind === "live" ? exploration?.result?.products : undefined;
  const [lon, lat] = subject.focus;
  const verdictProv = subject.kind === "live" ? SOURCE.liveVerdict : SOURCE.caseVerdict;
  const crops = reportCrops(subject.crops);
  return (
    <div className="x-sheet" role="dialog" aria-label={tr("More information")} data-testid="sheet">
      <header className="x-sheet__head">
        <div className="x-sheet__heading">
          <p className="x-kicker">
            {subject.name} · {lens?.chip} · {lat.toFixed(3)}, {lon.toFixed(3)}
          </p>
          <h2 className="x-sheet__title">
            {tr("What the radar measured")}{" "}
            {subject.kind === "case"
              ? `at ${subject.name}`
              : isArea
                ? "in your area"
                : "at your point"}
          </h2>
        </div>
        {regionalId !== undefined && (
          <div role="group" aria-label={tr("Sheet view")} className="x-switch">
            {(["plain", "regional"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setView(value)}
                data-testid={`read-${value}`}
              >
                {value === "plain" ? tr("Plain") : tr("Regional analysis")}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="x-round x-round--big"
          onClick={onClose}
          aria-label={tr("Close (Esc)")}
          data-testid="sheet-close"
        >
          <Icon name="close" size={16} />
        </button>
      </header>

      {regional && regionalId !== undefined && (
        <div className="x-sheet__body x-sheet__body--single" data-testid="sheet-regional">
          <div className="x-sheet__main">
            <RegionalAnalysisPanel explorationId={regionalId} />
          </div>
        </div>
      )}
      <div className="x-sheet__body" hidden={regional} inert={regional} data-testid="sheet-plain">
        <div className="x-sheet__main">
          {subject.kind === "live" && exploration !== undefined && (
            <LiveSciencePanel key={exploration.id} view={exploration} subject={subject} />
          )}
          <section className="x-sheet__section">
            <p className="x-sheet__kicker">{tr("01 · The question")}</p>
            <div className="x-cards">
              <Fact
                k="Where"
                v={subject.name}
                s={
                  subject.kind === "live" || subject.chipKm === undefined
                    ? subject.place
                    : `${subject.place} · ${subject.chipKm} km area`
                }
              />
              <Fact
                k="When"
                v={subject.target === undefined ? subject.when : formatDay(subject.target)}
                s={
                  subject.lens === "insar"
                    ? "Reference and secondary acquisition"
                    : "Target pass against earlier passes"
                }
              />
              <Fact k="Question" v={lens?.chip ?? ""} s={lens?.compares ?? ""} />
            </div>
          </section>

          <section className="x-sheet__section">
            <p className="x-sheet__kicker">{tr("02 · The measurement")}</p>
            {subject.figure !== undefined && (
              <figure className="x-figure">
                <img
                  src={subject.figure}
                  alt={`Backend report figure for ${subject.name}`}
                  loading="lazy"
                />
                <figcaption>
                  {tr("Real figure · nova-frontier-model report")}{" "}
                  <Prov kind="real" source={SOURCE.figure} />
                </figcaption>
              </figure>
            )}
            {subject.normalRange !== undefined && (
              <div className="x-inset">
                <NormalRangeCard range={subject.normalRange} />
                {subject.stat !== undefined && (
                  <p className="x-panel__stat" data-testid="sheet-stat">
                    <strong>{subject.stat}</strong> {subject.statLine}
                  </p>
                )}
              </div>
            )}
            {subject.passes !== undefined && (
              <div className="x-inset">
                <BandChart
                  passes={subject.passes}
                  mode="plain"
                  height={240}
                  sentence={bandSentence(subject.passes)}
                />
              </div>
            )}
            {subject.landslide !== undefined && <LandslidePanel evidence={subject.landslide} />}
            {crops !== undefined && (
              <>
                <div className="x-tiles">
                  <Tile
                    src={crops.base}
                    title={tr("Before · HH")}
                    ramp={VIRIDIS}
                    scale={["−30 dB", "0 dB"]}
                    text="Median of the baseline passes."
                  />
                  <Tile
                    src={crops.signature}
                    title={tr("Signature")}
                    text="Cells meeting the declared darkening rule, both channels."
                  />
                  <Tile
                    src={crops.change}
                    title={tr("Change · HH")}
                    ramp={CHANGE_RAMP}
                    scale={["−8", "+8 dB"]}
                    text="Blue darker, red brighter, grey no data."
                  />
                </div>
                <div className="x-compare x-inset">
                  <CompareSplit
                    left={{ src: crops.change, label: tr("Radar change") }}
                    right={{ src: crops.optical, label: tr("Optical classes") }}
                  />
                  <div className="x-compare__text">
                    <p className="x-compare__title">
                      {tr("Drag to compare the radar with the optical map")}
                    </p>
                    <p>
                      {tr(
                        "Left of the handle: the radar change in HH. Right: OPERA's optical classes for the same square. Where the optical map shows new water, look for blue (darker) radar change, and for blue change where there was no new water.",
                      )}
                    </p>
                    <ul className="x-swatches">
                      {OPTICAL_LEGEND.map((item) => (
                        <li key={item.label}>
                          <i style={{ background: item.color }} />
                          {item.label}
                        </li>
                      ))}
                    </ul>
                    <Prov kind="real" source={SOURCE.crop} />
                  </div>
                </div>
              </>
            )}
          </section>

          {scored && (
            <section className="x-sheet__section">
              <p className="x-sheet__kicker x-kicker--split">
                <span>
                  {subject.kind === "live"
                    ? "How the point compares with its baseline"
                    : "03 · The verdict, in plain words"}
                </span>
                <Prov kind={subject.demo ? "demo" : "real"} source={verdictProv} />
              </p>
              <div className="x-verdicts">
                {VERDICT_ORDER.map((verdict) => {
                  const on = verdict === subject.verdict;
                  return (
                    <div
                      key={verdict}
                      className="x-verdicts__card"
                      data-on={on}
                      data-testid={`sheet-verdict-${verdict}`}
                    >
                      <VerdictGlyph verdict={verdict} />
                      <p className="x-verdicts__label">{VERDICT[verdict].label}</p>
                      <p className="x-verdicts__sub">
                        {on ? subject.verdictLine : VERDICT[verdict].sub}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="x-sheet__section">
            <p className="x-sheet__kicker">{tr("04 · The second witness")}</p>
            {subject.fireContext !== undefined && <FireContextCard context={subject.fireContext} />}
            {subject.witness === undefined && subject.fireContext === undefined ? (
              <p className="x-muted">
                {exploration?.result?.lens?.evidence?.status === "optical_comparison_available"
                  ? "Independent optical comparison is available in the measured result."
                  : subject.kind === "live" && exploration?.result?.lens?.evidence === undefined
                    ? "No second witness: optical evidence was not requested for this question."
                    : subject.kind === "live"
                      ? "Independent optical measurements are unavailable for this result."
                      : "No second witness yet: the optical stage runs after the radar."}
              </p>
            ) : (
              subject.witness !== undefined && (
                <p className="x-witness">
                  <span>{subject.witness.label}</span>
                  <span>{subject.witness.note}</span>
                </p>
              )
            )}
            {subject.groups.length > 0 && (
              <div className="x-inset x-inset--stack">
                <div className="x-inset__chip">
                  <Prov kind="real" source={SOURCE.groups} />
                </div>
                {subject.groups.map((group) => (
                  <div key={group.title} className="x-group">
                    <p className="x-group__title">
                      {group.title} <span>{group.sub}</span>
                    </p>
                    <ContrastBars group={group} mode="plain" />
                  </div>
                ))}
                <p className="x-muted x-small">
                  {tr(
                    "Shares of cells in each group. Neighbouring cells are not independent, so these describe the scene, not accuracy.",
                  )}
                </p>
                {subject.matched !== undefined && (
                  <div className="x-group x-group--rule">
                    <MatchedWhisker matched={subject.matched} />
                    <Prov kind="real" source={SOURCE.matched} />
                  </div>
                )}
              </div>
            )}
            {subject.groups.length === 0 && subject.reason !== undefined && (
              <p className="x-reason">{subject.reason}</p>
            )}
          </section>

          <section className="x-sheet__section">
            <p className="x-sheet__kicker">{tr("05 · What this can't tell you")}</p>
            <div className="x-limits">
              <div className="x-limits__col">
                <p className="x-limits__head">{subject.plainLimit}</p>
                {subject.limitations.length > 0 && (
                  <div className="x-limits__list" data-testid="case-limitations">
                    <p className="x-muted x-small">
                      {CASE_LIMITATIONS.title} <Prov kind="real" source={CASE_LIMITATIONS.source} />
                    </p>
                    <ul>
                      {subject.limitations.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {subject.alternatives.length > 0 && (
                  <>
                    <p className="x-muted x-small">
                      {tr("Other things that change radar like this:")}
                    </p>
                    <ul className="x-tags">
                      {subject.alternatives.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="x-limits__col">
                <p className="x-muted x-small" data-testid="empties-line">
                  {EMPTIES_LINE}
                </p>
              </div>
            </div>
          </section>

          {/* What Technical used to add, kept whole but out of the plain reading. */}
          <details className="x-inset x-sheet__detail" data-testid="sheet-technical-detail">
            <summary>{tr("Technical detail")}</summary>
            {subject.passes !== undefined && (
              <BandChart passes={subject.passes} mode="technical" height={240} />
            )}
            {subject.landslide !== undefined && <LandslideTable evidence={subject.landslide} />}
            {scored && (
              <p className="x-mono-sm">
                {VERDICT[subject.verdict].label} · {VERDICT[subject.verdict].state}
              </p>
            )}
            <p className="x-muted" data-testid="tech-limit">
              {subject.techLimit}
            </p>
            {products && <PublishedFiles products={products} />}
          </details>
        </div>

        <aside className="x-sheet__side">
          {subject.compute !== undefined && subject.compute.length > 0 && (
            <div className="x-card">
              <p className="x-kicker x-kicker--split">
                <span>{tr("How this was computed")}</span>
                <Prov kind="real" source={SOURCE.liveQuality} />
              </p>
              <ol className="x-steps x-steps--done" data-testid="sheet-compute">
                {subject.compute.map((step) => (
                  <li key={step.label} className="x-step" data-state="done">
                    <span className="x-step__dot">
                      <Icon name="tick" size={10} />
                    </span>
                    <span className="x-step__text">
                      {step.label}
                      <span className="x-step__sub">{step.sub}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {subject.lens !== "insar" &&
            subject.lens !== "observed_dynamics" &&
            subject.compute === undefined && (
              <div className="x-card">
                <p className="x-kicker x-kicker--split">
                  <span>{tr("How this was computed")}</span>
                  <Prov kind="real" source={SOURCE.steps} />
                </p>
                <ol className="x-steps x-steps--done">
                  {jobSteps(subject.lens).map((step, index) => {
                    // Only the measured flood cases had an optical stage; elsewhere it didn't run.
                    const skipped = index === 5 && subject.crops?.optical === undefined;
                    return (
                      <li
                        key={step.label}
                        className="x-step"
                        data-state={skipped ? "skipped" : "done"}
                      >
                        <span className="x-step__dot">
                          <Icon name="tick" size={10} />
                        </span>
                        <span className="x-step__text">
                          {skipped ? step.label.replace("Looking for", "No") : step.label}
                          <span className="x-step__sub">
                            {skipped ? "not used for this result" : step.sub}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          <div className="x-card">
            <p className="x-kicker x-kicker--split">
              <span>{tr("Evidence and quality")}</span>
              <Prov
                kind={subject.demo ? "demo" : "real"}
                source={subject.kind === "live" ? SOURCE.liveQuality : SOURCE.caseQuality}
              />
            </p>
            <dl className="x-evidence">
              {subject.quality.map((item) => (
                <div key={item.k}>
                  <dt>{item.k}</dt>
                  <dd>{item.v}</dd>
                  <dd className="x-evidence__why">{item.why}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="x-card">
            <p className="x-kicker">{tr("Sources")}</p>
            <ul className="x-sources">
              {subject.sources.map((source) => (
                <li key={source.href}>
                  <a href={source.href} target="_blank" rel="noopener">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {onAskNova !== undefined && (
            <button type="button" className="x-ask-nova" onClick={onAskNova} data-testid="ask-nova">
              <NovaGlyph size={32} />
              {tr("Ask Nova about this result")}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
};

const Fact = ({ k, v, s }: { k: string; v: string; s: string }) => (
  <div className="x-fact">
    <span className="x-fact__k">{k}</span>
    <span className="x-fact__v">{v}</span>
    <span className="x-fact__s">{s}</span>
  </div>
);

type TileProps = {
  src: string;
  title: string;
  text: string;
  ramp?: string;
  scale?: [string, string];
};

const Tile = ({ src, title, text, ramp, scale }: TileProps) => (
  <figure className="x-tile">
    <img src={src} alt={title} loading="lazy" />
    <figcaption>
      <span className="x-tile__title">
        {title}
        <Prov kind="real" source={SOURCE.crop} />
      </span>
      {ramp !== undefined && <span className="x-tile__ramp" style={{ background: ramp }} />}
      {scale !== undefined && (
        <span className="x-tile__scale">
          <span>{scale[0]}</span>
          <span>{scale[1]}</span>
        </span>
      )}
      <span className="x-tile__text">{text}</span>
    </figcaption>
  </figure>
);
