import { useEffect, useState } from "react";

import { FireContextCard } from "@/features/case-panel/FireContextCard";
import { InsarCard } from "@/features/case-panel/InsarCard";
import { NormalRangeCard } from "@/features/case-panel/NormalRangeCard";
import { REPORT } from "@/content/copyV8";
import { SOURCE, VERDICT } from "@/features/case-panel/verdicts";
import { findLens, type LensId } from "@/features/cases/cases";
import { ContrastBars } from "@/features/charts/ContrastBars";
import { exportName } from "@/features/downloads/dataCsv";
import { getExploration } from "@/features/explore/exploreApi";
import type { ExplorationView } from "@/features/explore/exploreSchemas";
import { exploreSubject } from "@/features/explore/exploreSubject";
import { EMPTIES_LINE, formatLonLat } from "@/features/live/liveQuestion";
import { formatDay } from "@/features/timeline/timelineLayout";
import { CHANNELS } from "@/features/landslide/landslideEvidence";
import { absoluteApiPath, ApiError } from "@/lib/api/apiClient";
import { Link } from "@/lib/Link";
import { ProvenanceChip } from "@/lib/ProvenanceChip";
import { useAsync } from "@/lib/useAsync";
import { VERSION } from "@/pages/explorer/StartCard";
import { SUMMARY_LABEL } from "@/pages/report/reportSummary";

type Ring = Array<[number, number]>;

// The result carries the analysed area (a polygon), not the clicked point: it is named by its centre.
const centreOf = (view: ExplorationView): [number, number] => {
  const geometry = view.result?.geometry;
  const coordinates = geometry?.["coordinates"];
  const first = Array.isArray(coordinates)
    ? (coordinates as unknown[]).flat(geometry?.["type"] === "MultiPolygon" ? 1 : 0)[0]
    : undefined;
  const ring = (Array.isArray(first) ? first : []) as Ring;
  const points = ring.filter((vertex) => Array.isArray(vertex) && vertex.length >= 2);
  if (points.length === 0) return [0, 0];
  const lons = points.map(([value]) => value);
  const lats = points.map(([, value]) => value);
  return [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
};

const nameOf = (view: ExplorationView): string => formatLonLat(centreOf(view));

// The measured images worth printing: the lens's own change (or coherence) layer first, then the
// target pass as the radar saw it. Demo results have no layers to show.
const figuresOf = (view: ExplorationView) => {
  const layers = view.result?.layers ?? [];
  const first = layers.find((layer) => ["change", "diagnostic", "coherence"].includes(layer.kind));
  const target = view.result?.lens?.target_date;
  const observed =
    layers.find(
      (layer) => layer.kind === "observed" && target !== undefined && layer.id.includes(target),
    ) ?? layers.find((layer) => layer.kind === "observed");
  return [first, observed].filter((layer) => layer !== undefined);
};

const db = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : `${value.toFixed(2)} dB`;

const frameOf = (view: ExplorationView): string => {
  const scene = view.result?.scenes[0];
  return scene === undefined ? "NISAR frame" : `Track ${scene.track} · Frame ${scene.frame}`;
};

// /report?exploration=<id>: the same printable page for a live answer. Every number comes from the
// backend's answer; the summary is a template filled from those fields, never AI-written.
export const LiveReport = ({ id }: { id: string }) => {
  const { state, retry } = useAsync((signal) => getExploration(id, signal), id);
  const view = state?.status === "success" ? state.data : undefined;
  const subject =
    view === undefined
      ? undefined
      : exploreSubject(view, {
          name: nameOf(view),
          frameLabel: frameOf(view),
          point: centreOf(view),
        });
  const [generated] = useState(() => new Date().toISOString().slice(0, 10));
  // An id the backend doesn't know is a missing answer; any other failure can be tried again.
  const failed =
    state?.status === "error" && !(state.error instanceof ApiError && state.error.status === 404);

  useEffect(() => {
    // #37: "Save as PDF" names the file after the page title.
    document.title = exportName(`exploration-${id}`, new Date().toISOString().slice(0, 10), "");
  }, [id]);

  const heading = (
    <div className="r-actions">
      <Link to="/explore" className="r-button">
        Back to the explorer
      </Link>
      {subject !== undefined && (
        <button
          type="button"
          className="r-button r-button--dark"
          onClick={() => window.print()}
          data-testid="report-print"
        >
          Save as PDF
        </button>
      )}
    </div>
  );

  if (state === undefined || state.status === "loading")
    return (
      <main className="r-page" data-testid="report">
        {heading}
        <article className="r-sheet" role="status">
          <p className="r-kicker">Loading the answer…</p>
        </article>
      </main>
    );
  if (state.status === "error" || subject === undefined || view === undefined)
    return (
      <main className="r-page" data-testid="report">
        {heading}
        <article className="r-sheet" role="alert" data-testid="report-empty">
          <p className="r-kicker">NISAR Hazard Watch · Radar evidence report</p>
          {failed ? (
            <>
              <h1 className="r-title">{REPORT.loadFailed}</h1>
              <p>{REPORT.loadFailedBody}</p>
              <button
                type="button"
                className="r-button r-button--dark"
                onClick={retry}
                data-testid="report-retry"
              >
                {REPORT.retry}
              </button>
            </>
          ) : (
            <>
              <h1 className="r-title">No finished answer called “{id}”</h1>
              <p>
                The answer is missing or still running. Ask the question again from the explorer and
                open the report once it is done.
              </p>
            </>
          )}
        </article>
      </main>
    );

  const lens = findLens(subject.lens as LensId);
  const group = subject.groups[0];
  const figures = figuresOf(view);
  return (
    <main className="r-page" data-testid="report">
      {heading}
      <article className="r-sheet">
        <header className="r-head">
          <div className="r-head__main">
            <p className="r-kicker">NISAR Hazard Watch · Radar evidence report · live question</p>
            <h1 className="r-title" data-testid="report-title">
              {subject.name}
            </h1>
            <p className="r-sub">
              {lens?.chip} · {lens?.compares}
            </p>
          </div>
          <p className="r-meta">
            Exploration {view.id}
            <br />
            {subject.place}
            <br />
            Generated {generated}
          </p>
        </header>

        <section className="r-summary" data-testid="report-summary">
          <p className="r-summary__head">
            <span>{SUMMARY_LABEL}</span>
            <span>Not AI-written · check every number against the data blocks</span>
          </p>
          <p className="r-summary__text">
            {`${subject.name} (${subject.place}) was asked “${lens?.chip ?? subject.lens}” ${subject.verdict === "measured" ? "" : `Verdict: ${VERDICT[subject.verdict].label}. `}${subject.verdictLine}${subject.stat === undefined ? "" : ` ${subject.stat} ${subject.statLine ?? ""}`} ${subject.plainLimit}${subject.fireContext?.status === "available" ? ` Fire context, separate from the radar (NASA FIRMS): ${subject.fireContext.headline}.` : ""}`}
          </p>
        </section>

        <section className="r-block">
          <p className="r-kicker">Data 1 · The question and the verdict</p>
          <dl className="r-facts">
            <Fact k="Question" v={lens?.chip ?? ""} />
            <Fact
              k="Target pass"
              v={subject.target === undefined ? "—" : formatDay(subject.target)}
            />
            <Fact
              k={subject.verdict === "measured" ? "Result" : "Verdict"}
              v={VERDICT[subject.verdict].label}
            />
            <Fact k="Area" v={`${(view.result?.areaKm2 ?? 0).toFixed(1)} km²`} />
            <Fact k="Mode" v={view.cache === "hit" ? REPORT.offline : REPORT.online} />
            <Fact
              k="Scientific status"
              v={view.result?.scientificStatus ?? REPORT.scientificStatus}
            />
          </dl>
          <p className="r-line">
            {subject.verdictLine}{" "}
            <ProvenanceChip kind={subject.demo ? "demo" : "real"} source={SOURCE.liveVerdict} />
          </p>
        </section>

        {subject.insar !== undefined && (
          <section className="r-block r-keep">
            <p className="r-kicker r-kicker--split">
              <span>Data 2 · What the pair measured</span>
              <ProvenanceChip kind="real" source={SOURCE.liveInsar} />
            </p>
            <InsarCard insar={subject.insar} heading={false} />
          </section>
        )}

        {subject.normalRange !== undefined && (
          <section className="r-block r-keep">
            <p className="r-kicker r-kicker--split">
              <span>Data 2 · The target pass against the normal range</span>
              <ProvenanceChip kind="real" source={SOURCE.liveRange} />
            </p>
            <div className="r-dark">
              <NormalRangeCard range={subject.normalRange} heading={false} />
            </div>
          </section>
        )}

        {group !== undefined && (
          <section className="r-block r-keep">
            <p className="r-kicker r-kicker--split">
              <span>Data 3 · Cells that left their normal range</span>
              <ProvenanceChip kind="real" source={SOURCE.liveQuality} />
            </p>
            <div className="r-dark">
              <ContrastBars group={group} mode="technical" />
            </div>
            <p className="r-line" data-testid="report-stat">
              <strong>{subject.stat}</strong> {subject.statLine}
            </p>
          </section>
        )}

        {subject.fireContext !== undefined && (
          <section className="r-block r-keep">
            <p className="r-kicker r-kicker--split">
              <span>Independent fire context · separate from the radar</span>
              {subject.fireContext.status === "available" && (
                <ProvenanceChip kind="real" source={SOURCE.liveFire} />
              )}
            </p>
            <FireContextCard context={subject.fireContext} heading={false} />
          </section>
        )}

        {figures.length > 0 && (
          <section className="r-block r-keep" data-testid="report-figures">
            <p className="r-kicker r-kicker--split">
              <span>{REPORT.imagesKicker}</span>
              <ProvenanceChip kind={subject.demo ? "demo" : "real"} source={SOURCE.liveQuality} />
            </p>
            <div className="r-figures">
              {figures.map((layer) => (
                <figure key={layer.id}>
                  <img src={absoluteApiPath(layer.url)} alt={layer.title} />
                  <figcaption>
                    {layer.title}
                    {layer.dates !== undefined && layer.dates !== null && layer.dates.length > 0
                      ? ` · ${layer.dates.join(" → ")}`
                      : ""}
                    {layer.units ? ` · ${layer.units}` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <section className="r-block r-keep" data-testid="report-values">
          <p className="r-kicker r-kicker--split">
            <span>{REPORT.valuesKicker}</span>
            <ProvenanceChip kind={subject.demo ? "demo" : "real"} source={SOURCE.liveQuality} />
          </p>
          <table className="r-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
                {CHANNELS.map((channel) => (
                  <th key={channel} scope="col">
                    {channel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...(view.result?.observations ?? [])]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((row) => (
                  <tr key={row.date}>
                    <th scope="row">{row.date}</th>
                    <td>{row.status.replaceAll("_", " ")}</td>
                    {CHANNELS.map((channel) => (
                      <td key={channel}>{db(row.point_db?.[channel])}</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="r-small">{REPORT.valuesNote}</p>
        </section>

        <section className="r-cols r-keep">
          <div className="r-block">
            <p className="r-kicker r-kicker--split">
              <span>Data 4 · Evidence and quality</span>
              <ProvenanceChip kind="real" source={SOURCE.liveQuality} />
            </p>
            <dl className="r-quality">
              {subject.quality.map((entry) => (
                <div key={entry.k}>
                  <dt>{entry.k}</dt>
                  <dd>{entry.v}</dd>
                  <dd className="r-quality__why">{entry.why}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="r-block">
            <p className="r-kicker">Data 5 · What this can't tell you</p>
            <p>{subject.plainLimit}</p>
            <p className="r-small">{subject.techLimit}</p>
            <p className="r-mono">{EMPTIES_LINE}</p>
          </div>
        </section>

        <section className="r-block r-keep">
          <p className="r-kicker">Data 6 · Scenes read</p>
          <ul className="r-sources" data-testid="report-scenes">
            {view.result?.scenes.map((scene) => (
              <li key={scene.granuleId}>
                {formatDay(scene.acquiredAt.slice(0, 10))} · {scene.maturity} ·{" "}
                <span className="r-url">{scene.granuleId}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="r-block r-keep">
          <p className="r-kicker">Sources</p>
          <ul className="r-sources">
            {subject.sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} target="_blank" rel="noopener">
                  {source.label}
                </a>{" "}
                · <span className="r-url">{source.href}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="r-foot">
          <span>Nova Frontier · NASA Space Apps 2026 · Chía</span>
          <span>{VERSION} · diagnostic evidence, not a validated classifier</span>
        </footer>
      </article>
    </main>
  );
};

const Fact = ({ k, v }: { k: string; v: string }) => (
  <div>
    <dt>{k}</dt>
    <dd>{v}</dd>
  </div>
);
