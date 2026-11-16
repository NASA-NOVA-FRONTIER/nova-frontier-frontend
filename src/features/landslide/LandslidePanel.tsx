import "@/features/landslide/landslide.css";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { LANDSLIDE } from "@/content/copyV8";
import { Prov } from "@/features/case-panel/Prov";
import { CHANNEL, type ChartMode } from "@/features/charts/chartTokens";
import {
  assessmentPasses,
  baselineImage,
  baselinePasses,
  CHANNELS,
  daysBetween,
  formatDb,
  formatIqr,
  isPerChannel,
  outsidePercent,
  passImage,
  viewImage,
  type Channel,
  type LandslideEvidence,
} from "@/features/landslide/landslideEvidence";
import { CompareSplit } from "@/features/sheet/CompareSplit";
import { formatDay } from "@/features/timeline/timelineLayout";
import { ProvenanceChip } from "@/lib/ProvenanceChip";

type Props = { evidence: LandslideEvidence; mode: ChartMode };

const PASS_VIEW = "pass";
const GRAY = "linear-gradient(90deg,#000,#fff)";
const count = (value: number): string => value.toLocaleString("en-US");
const shortDay = (time: number): string => formatDay(new Date(time).toISOString(), false);

// #24: what the radar measured at a landslide case, read from its own series and layers. Numbers are
// REAL; reading them as landslide evidence is EXPERIMENTAL, and the panel says so first.
export const LandslidePanel = ({ evidence, mode }: Props) => {
  const [viewId, setViewId] = useState(PASS_VIEW);
  const [channel, setChannel] = useState<Channel>("HH");
  const [date, setDate] = useState(evidence.target);
  const tech = mode === "technical";
  const source = evidence.source.label;
  const baseline = baselinePasses(evidence);
  const assessed = assessmentPasses(evidence);
  const first = evidence.passes[0];
  const view = evidence.views.find((item) => item.id === viewId);
  const perChannel = view === undefined || isPerChannel(view);
  const dates = evidence.passes.map((item) => item.date);
  const at = Math.max(0, dates.indexOf(date));
  const role =
    evidence.passes[at]?.role === "baseline" ? LANDSLIDE.baselineRole : LANDSLIDE.assessmentRole;
  const rows = evidence.passes.map((item) => ({
    date: item.date,
    time: Date.parse(item.date),
    areaHH: item.area.HH.median,
    areaHV: item.area.HV.median,
    pointHH: item.point.HH,
    pointHV: item.point.HV,
  }));
  const baseStart = rows[0]?.time;
  const baseEnd = rows[baseline.length - 1]?.time;

  const showPass = (day: string) => {
    setDate(day);
    setViewId(PASS_VIEW);
  };

  return (
    <div className="x-ls" data-testid="landslide-panel">
      <div className="x-ls__aftermath" role="note" data-testid="landslide-aftermath">
        <p className="x-kicker x-kicker--split">
          <span>{LANDSLIDE.kicker}</span>
          <ProvenanceChip kind="experimental" source={LANDSLIDE.experimentalWhy} />
        </p>
        <p className="x-ls__title">{LANDSLIDE.aftermathTitle}</p>
        <p>
          {first === undefined
            ? ""
            : LANDSLIDE.aftermathBody(
                formatDay(evidence.event.date),
                formatDay(first.date),
                daysBetween(evidence.event.date, first.date),
              )}
        </p>
      </div>

      <section className="x-radar x-ls__imagery" aria-label={LANDSLIDE.imagery}>
        <header className="x-kicker--split">
          <h3 className="x-sheet__kicker">{LANDSLIDE.imagery}</h3>
          <Prov kind="real" source={source} />
        </header>
        <div role="group" aria-label={LANDSLIDE.view} className="x-ls__chips">
          {[{ id: PASS_VIEW, title: LANDSLIDE.viewPass }, ...evidence.views].map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === viewId}
              onClick={() => setViewId(item.id)}
              data-testid={`landslide-view-${item.id}`}
            >
              {item.title}
            </button>
          ))}
        </div>
        <div role="group" aria-label={LANDSLIDE.channel} className="x-switch x-ls__channel">
          {CHANNELS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={perChannel && channel === value}
              disabled={!perChannel}
              onClick={() => setChannel(value)}
              data-testid={`landslide-channel-${value}`}
            >
              {value}
            </button>
          ))}
        </div>
        {view === undefined ? (
          <>
            <label className="x-radar__date">
              <span>
                {LANDSLIDE.pass} · {formatDay(date)} · {role} · {at + 1} of {dates.length}
              </span>
              <input
                type="range"
                min={0}
                max={dates.length - 1}
                value={at}
                aria-label={LANDSLIDE.pass}
                aria-valuetext={`${formatDay(date)}, ${role}`}
                onChange={(event) => setDate(dates[Number(event.target.value)] ?? date)}
                data-testid="landslide-date"
              />
              <span className="x-radar__ends">
                <span>{formatDay(dates[0] ?? date)}</span>
                <span>{formatDay(dates.at(-1) ?? date)}</span>
              </span>
            </label>
            <CompareSplit
              key={`${date}-${channel}`}
              left={{ src: baselineImage(evidence, channel), label: LANDSLIDE.compareLeft }}
              right={{
                src: passImage(evidence, date, channel),
                label: `${channel} · ${formatDay(date, false)}`,
              }}
              aspectRatio={1}
            />
            <Legend3
              ramp={GRAY}
              scale={LANDSLIDE.grayScale}
              text={LANDSLIDE.passText(formatDay(date), channel)}
            />
          </>
        ) : (
          <>
            <img
              className="x-radar__image x-ls__image"
              src={viewImage(view, channel)}
              alt={`${view.title}${perChannel ? ` · ${channel}` : ""}`}
              data-testid="landslide-image"
            />
            <Legend3 ramp={view.ramp} scale={view.scale} text={view.text} />
          </>
        )}
      </section>

      <section className="x-sheet__section" aria-label={LANDSLIDE.history}>
        <p className="x-sheet__kicker x-kicker--split">
          <span>{LANDSLIDE.history}</span>
          <Prov kind="real" source={source} />
        </p>
        <div className="x-inset">
          <div className="x-ls__plot" data-testid="landslide-history">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rows}
                margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
                onClick={(state) => {
                  const row = rows.find((item) => item.time === Number(state.activeLabel));
                  if (row !== undefined) showPass(row.date);
                }}
              >
                <CartesianGrid stroke="var(--line)" vertical={false} />
                {baseStart !== undefined && baseEnd !== undefined && (
                  <ReferenceArea x1={baseStart} x2={baseEnd} fill="var(--fill)" />
                )}
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={shortDay}
                />
                <YAxis
                  width={64}
                  allowDecimals={false}
                  domain={[
                    (min: number) => Math.floor(min - 1),
                    (max: number) => Math.ceil(max + 1),
                  ]}
                  tickFormatter={(value: number) => `${value} dB`}
                />
                <Tooltip
                  labelFormatter={(value) => formatDay(new Date(Number(value)).toISOString())}
                  formatter={(value) => formatDb(Number(value)).replace("+", "")}
                />
                <Legend />
                <ReferenceLine x={Date.parse(date)} stroke="var(--gold)" />
                {(["HH", "HV"] as const).flatMap((key) => {
                  const look = CHANNEL[key === "HH" ? "hh" : "hv"];
                  return [
                    <Line
                      key={`area${key}`}
                      name={key === "HH" ? LANDSLIDE.areaHH : LANDSLIDE.areaHV}
                      dataKey={`area${key}`}
                      stroke={look.color}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />,
                    <Line
                      key={`point${key}`}
                      name={key === "HH" ? LANDSLIDE.pointHH : LANDSLIDE.pointHV}
                      dataKey={`point${key}`}
                      stroke={look.color}
                      strokeDasharray="4 4"
                      strokeOpacity={0.7}
                      isAnimationActive={false}
                    />,
                  ];
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="x-muted x-small">{LANDSLIDE.historyText}</p>
        </div>
      </section>

      <section className="x-sheet__section" aria-label={LANDSLIDE.outside}>
        <p className="x-sheet__kicker x-kicker--split">
          <span>{LANDSLIDE.outside}</span>
          <Prov kind="real" source={source} />
        </p>
        <div className="x-inset x-ls__bars" data-testid="landslide-outside">
          {assessed.map((item) => {
            const share = outsidePercent(item, evidence.cells) ?? 0;
            return (
              <button
                key={item.date}
                type="button"
                className="x-ls__bar"
                aria-pressed={viewId === PASS_VIEW && item.date === date}
                onClick={() => showPass(item.date)}
                data-testid={`landslide-outside-${item.date}`}
              >
                <span className="x-ls__bar-date">{formatDay(item.date)}</span>
                <span className="x-ls__bar-track" aria-hidden="true">
                  <span className="x-ls__bar-fill" style={{ width: `${share}%` }} />
                </span>
                <span className="x-ls__bar-value">
                  <strong>{share.toFixed(1)}%</strong>{" "}
                  {LANDSLIDE.outsideRow(count(item.outsideCells ?? 0), count(evidence.cells))}
                </span>
              </button>
            );
          })}
          <p className="x-muted x-small">
            {LANDSLIDE.outsideText} {tech && evidence.band}
          </p>
        </div>
      </section>

      <section
        className="x-sheet__section"
        aria-label={LANDSLIDE.shift(formatDay(evidence.target))}
      >
        <p className="x-sheet__kicker x-kicker--split">
          <span>{LANDSLIDE.shift(formatDay(evidence.target))}</span>
          <Prov kind="real" source={source} />
        </p>
        <div className="x-cards">
          {CHANNELS.map((key) => {
            const area = evidence.shift.area[key];
            return (
              <div key={key} className="x-fact" data-testid={`landslide-shift-${key}`}>
                <span className="x-fact__k">
                  {key} · {LANDSLIDE.shiftArea}
                </span>
                <span className="x-fact__v">{formatDb(area.median)}</span>
                <span className="x-fact__s">
                  {LANDSLIDE.shiftIqr(formatIqr(area.iqr))}
                  <br />
                  {LANDSLIDE.shiftPoint(formatDb(evidence.shift.point[key]))}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <details className="x-inset x-ls__table" open={tech} data-testid="landslide-table">
        <summary>{LANDSLIDE.table}</summary>
        <div className="x-radar__table">
          <table>
            <thead>
              <tr>
                <th scope="col">{LANDSLIDE.tableDate}</th>
                <th scope="col">{LANDSLIDE.tableRole}</th>
                {CHANNELS.map((key) => (
                  <th key={`a${key}`} scope="col">
                    {LANDSLIDE.tableArea(key)}
                  </th>
                ))}
                {CHANNELS.map((key) => (
                  <th key={`p${key}`} scope="col">
                    {LANDSLIDE.tablePoint(key)}
                  </th>
                ))}
                <th scope="col">{LANDSLIDE.tableOutside}</th>
              </tr>
            </thead>
            <tbody>
              {evidence.passes.map((item) => {
                const share = outsidePercent(item, evidence.cells);
                return (
                  <tr key={item.date}>
                    <th scope="row">{item.date}</th>
                    <td>
                      {item.role === "baseline" ? LANDSLIDE.baselineRole : LANDSLIDE.assessmentRole}
                    </td>
                    {CHANNELS.map((key) => (
                      <td key={`a${key}`}>{item.area[key].median.toFixed(2)}</td>
                    ))}
                    {CHANNELS.map((key) => (
                      <td key={`p${key}`}>{item.point[key].toFixed(2)}</td>
                    ))}
                    <td>{share === undefined ? "—" : `${share.toFixed(1)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      <section className="x-sheet__section" aria-label={LANDSLIDE.how}>
        <p className="x-sheet__kicker">{LANDSLIDE.how}</p>
        <ol className="x-ls__how" data-testid="landslide-how">
          {LANDSLIDE.howSteps(
            evidence.series,
            `${formatDay(baseline[0]?.date ?? "", false)} – ${formatDay(baseline.at(-1)?.date ?? "")}`,
            formatDay(evidence.target),
            `${evidence.gridKm} km, ${evidence.postingM} m`,
          ).map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>
            {LANDSLIDE.bandRule}: {evidence.band}
          </li>
        </ol>
      </section>
    </div>
  );
};

type LegendProps = { ramp: string | undefined; scale: [string, string]; text: string };

const Legend3 = ({ ramp, scale, text }: LegendProps) => (
  <div className="x-radar__legend">
    {ramp !== undefined && <span className="x-radar__ramp" style={{ background: ramp }} />}
    <span className="x-radar__ends">
      <span>{scale[0]}</span>
      <span>{scale[1]}</span>
    </span>
    <span>{text}</span>
  </div>
);
