import { useState } from "react";
import { z } from "zod";

import { InsarCard } from "@/features/case-panel/InsarCard";
import type { Subject } from "@/features/case-panel/subject";
import type { ExplorationView } from "@/features/explore/exploreSchemas";
import { RadarHistory } from "@/features/sheet/RadarHistory";
import { RadarImagePanel } from "@/features/sheet/RadarImagePanel";

import { tr } from "@/i18n/translate";
const count = z.number().int().nonnegative();
const radarCounts = z.object({
  common_cells: count.optional(),
  dual_darkening_cells: count.optional(),
  co_pol_brightening_cells: count.optional(),
});
const agriculture = z.object({
  reason: z.string().nullish(),
  steps: z
    .record(
      z.string(),
      z.object({
        synchrony_interval_code: count.nullable(),
        intervals: z.array(z.object({ code: count, dates: z.tuple([z.string(), z.string()]) })),
        synchrony: z.object({
          fraction: z.number(),
          reason: z.string().nullish(),
          focal_cells: count,
          synchronous_cells: count,
          spatial_95_interval: z.tuple([z.number(), z.number()]).nullable(),
        }),
      }),
    )
    .optional(),
});
const fire = z.object({
  cross_pol_history: z.object({
    decline_dates: count.nullable(),
    assessed_dates: count,
    pattern: z.string().nullable(),
  }),
});

const cells = (value: number) => value.toLocaleString("en-US");

export const LiveSciencePanel = ({
  view,
  subject,
}: {
  view: ExplorationView;
  subject: Subject;
}) => {
  const [selectedDate, setSelectedDate] = useState<string>();
  const result = view.result;
  if (result === null || result.isDemo) return null;
  const dates = [...new Set(result.observations.map((row) => row.date))].sort();
  const lens = result.lens;
  const target = lens?.target_date ?? dates.at(-1) ?? "";
  const date =
    selectedDate && dates.includes(selectedDate)
      ? selectedDate
      : dates.includes(target)
        ? target
        : (dates.at(-1) ?? "");
  const baseline = lens?.baseline_dates ?? [];
  const assessment = lens?.assessment_dates ?? (target ? [target] : []);
  const counts = radarCounts.safeParse(lens?.radar).data;
  const farm =
    subject.lens === "agriculture" ? agriculture.safeParse(lens?.evaluation).data : undefined;
  const fireHistory = fire.safeParse(lens?.point).data?.cross_pol_history;
  const hasPower = result.observations.some((row) =>
    Object.values(row.point_db ?? {}).some((value) => value !== null),
  );
  const newContract = result.products != null;
  return (
    <>
      <RadarImagePanel
        result={result}
        date={date}
        dates={dates}
        target={target}
        onDate={setSelectedDate}
      />
      <section className="x-sheet__section" aria-label={tr("Lens features")}>
        <h3 className="x-sheet__kicker">{tr("Lens evidence")}</h3>
        {view.status === "partial" && (
          <p className="x-muted" role="status">
            {tr("Partial result. Some measurements are unavailable.")}
          </p>
        )}
        {view.status === "noData" && (
          <p className="x-muted" role="status">
            {tr("Insufficient measured support for this exploration.")}
          </p>
        )}
        {subject.insar ? (
          <InsarCard insar={subject.insar} />
        ) : (
          <div className="x-inset x-radar__legend">
            <strong>{subject.verdictLine}</strong>
            {baseline.length > 0 && (
              <span>
                {tr("Baseline acquisitions · ")} {baseline.join(" · ")}
              </span>
            )}
            {assessment.length > 0 && (
              <span>
                {tr("Assessment acquisitions · ")} {assessment.join(" · ")}
              </span>
            )}
            {counts?.common_cells !== undefined && (
              <span>
                {tr("Shared radar support · ")} {cells(counts.common_cells)} cells
              </span>
            )}
            {counts?.dual_darkening_cells !== undefined && counts.common_cells !== undefined && (
              <span>
                {tr("Dual-polarization darkening · ")} {cells(counts.dual_darkening_cells)} of{" "}
                {cells(counts.common_cells)} {tr("shared cells")}
              </span>
            )}
            {counts?.co_pol_brightening_cells !== undefined &&
              counts.common_cells !== undefined && (
                <span>
                  {tr("Co-polarization brightening · ")} {cells(counts.co_pol_brightening_cells)} of{" "}
                  {cells(counts.common_cells)} {tr("shared cells")}
                </span>
              )}
            {farm?.reason && (
              <span>
                {tr("Matched surroundings · ")} {farm.reason.replaceAll("_", " ")}
              </span>
            )}
            {Object.entries(farm?.steps ?? {}).map(([channel, step]) => {
              const synch = step.synchrony;
              const bracket = step.intervals.find(
                (interval) => interval.code === step.synchrony_interval_code,
              );
              return (
                <div key={channel}>
                  <p>
                    {channel.replace("_over_", " / ")} · {cells(synch.synchronous_cells)} of{" "}
                    {cells(synch.focal_cells)}{" "}
                    {tr("matched focal cells shared the selected step (")}
                    {(100 * synch.fraction).toFixed(1)}%).
                  </p>
                  {bracket && (
                    <p>
                      {tr("Observed bracket · ")} {bracket.dates.join(" to ")}
                    </p>
                  )}
                  {synch.spatial_95_interval && (
                    <p>
                      {tr("Conditional spatial interval (95%) ·")}{" "}
                      {synch.spatial_95_interval
                        .map((value) => `${(100 * value).toFixed(1)}%`)
                        .join(" to ")}
                    </p>
                  )}
                  {synch.reason && (
                    <p>
                      {tr("Synchrony support · ")} {synch.reason.replaceAll("_", " ")}
                    </p>
                  )}
                </div>
              );
            })}
            {fireHistory?.decline_dates != null && (
              <span>
                {tr("Cross-polarized declines at the point · ")} {fireHistory.decline_dates} of{" "}
                {fireHistory.assessed_dates} {tr("assessment dates")}
              </span>
            )}
            {fireHistory?.pattern && (
              <span>
                {tr("Sampled return pattern · ")} {fireHistory.pattern.replaceAll("_", " ")}
              </span>
            )}
            {subject.reason && <span>{subject.reason}</span>}
          </div>
        )}
      </section>
      {hasPower ? (
        <RadarHistory observations={result.observations} date={date} onDate={setSelectedDate} />
      ) : (
        result.insar == null && (
          <p className="x-muted">{tr("Point-return history is unavailable for this result.")}</p>
        )
      )}
      {newContract && (
        <details className="x-inset x-radar__files">
          <summary>{tr("Acquisition provenance")}</summary>
          <ul>
            {result.observations.map((row) => (
              <li key={row.date}>
                {row.sensing_start_utc ?? row.date} ·{" "}
                {row.granule_title ?? row.granule_id ?? "Granule unavailable"} ·{" "}
                {row.status.replaceAll("_", " ")}
              </li>
            ))}
          </ul>
          {typeof result.quality.revision === "string" && (
            <p>
              {tr("Modeling revision · ")} <code>{result.quality.revision}</code>
            </p>
          )}
          {Array.isArray(result.quality.measuredPoint) && (
            <p>
              {tr("Measured center (longitude, latitude) · ")}{" "}
              {result.quality.measuredPoint.join(", ")}°
            </p>
          )}
        </details>
      )}
    </>
  );
};
