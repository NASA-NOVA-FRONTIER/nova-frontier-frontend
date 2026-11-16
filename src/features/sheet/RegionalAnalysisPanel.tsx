import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Prov } from "@/features/case-panel/Prov";
import { SOURCE } from "@/features/case-panel/verdicts";
import { CHANNEL } from "@/features/charts/chartTokens";
import { isFinal } from "@/features/explore/exploreSchemas";
import type { ScienceProducts } from "@/features/explore/scienceProducts";
import { gridDescription } from "@/features/sheet/radarViews";
import { retryRegionalRun, useRegionalRun } from "@/features/sheet/regionalRuns";
import { absoluteApiPath } from "@/lib/api/apiClient";
import { ProvenanceChip } from "@/lib/ProvenanceChip";

import { tr } from "@/i18n/translate";
type Row = Record<string, string | number | null>;
const COLOURS = [CHANNEL.hh.color, CHANNEL.hv.color, "#bb9bce", "#75c9af"];

export const PublishedFiles = ({ products }: { products: ScienceProducts }) =>
  products.assets.length > 0 && (
    <details className="x-inset x-radar__files">
      <summary>{tr("Published artifacts and SHA-256 hashes")}</summary>
      <ul>
        {products.assets.map((asset) => (
          <li key={asset.name}>
            <a href={absoluteApiPath(asset.url)} target="_blank" rel="noreferrer">
              {asset.name}
            </a>
            {" · "}
            {asset.bytes.toLocaleString("en-US")} bytes <code>{asset.sha256}</code>
          </li>
        ))}
      </ul>
    </details>
  );

const RegionalCharts = ({ products }: { products: ScienceProducts }) => {
  const analysis = products.analysis;
  if (analysis == null) return null;
  const { observations, capabilities, series } = analysis;
  const spectral = series.spectral_series ?? [];
  const keys = Object.keys(spectral[0] ?? {}).filter((key) => key.endsWith("_normalized_power"));
  const sorted = [...spectral].sort((a, b) => Number(a.period_days) - Number(b.period_days));
  const assets = new Map(products.assets.map((asset) => [asset.name, asset]));
  const supportedGP = series.gp_historical_series?.some((row) => row.status === "fit_returned");
  const regionalRows = series.regional_timeseries ?? [];
  return (
    <>
      <div className="x-radar__legend">
        <strong>{tr("Regional sample")}</strong>
        <span>{tr("Catalog-selected acquisitions and native chip for this job.")}</span>
        <span>
          {tr("Acquisitions · ")} {observations.dates?.join(" · ") || "Unavailable"}
        </span>
        {observations.grid && <span>{gridDescription(observations.grid)}</span>}
        {observations.grid && (
          <span>
            {tr("Native bounds W, S, E, N · ")} {observations.grid.bounds_native.join(", ")} m
          </span>
        )}
        {analysis.point && (
          <span>
            {tr("Job center · ")} {analysis.point.join(", ")}
            {tr("° (longitude, latitude)")}
          </span>
        )}
      </div>
      {regionalRows.length > 0 && (
        <details className="x-inset">
          <summary>{tr("Regional means and spatial intervals")}</summary>
          <p className="x-muted x-small">
            {tr(
              "Intervals resample spatial blocks on common support. Observation noise is unestimated.",
            )}
          </p>
          {observations.regional_aggregation && (
            <p className="x-small">
              {tr("Common support ·")}{" "}
              {observations.regional_aggregation.supported_pixels.toLocaleString("en-US")} cells
            </p>
          )}
          <MeasurementTable
            rows={regionalRows}
            columns={{
              date: "UTC date",
              polarization: "Channel",
              mean_log_power_db: "Mean (dB)",
              lower_95_db: "95% lower (dB)",
              upper_95_db: "95% upper (dB)",
              spatial_block_count: "Blocks",
            }}
          />
        </details>
      )}
      <h4>{tr("Temporal spectrum")}</h4>
      {keys.length === 0 ? (
        <p className="x-muted">
          {capabilities.spectral?.reason?.replaceAll("_", " ") ??
            "No supported temporal spectrum was returned."}
        </p>
      ) : (
        <figure className="x-inset">
          <figcaption>{tr("Candidate periods on measured dates")}</figcaption>
          <div className="x-radar__plot">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sorted}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="period_days"
                  domain={["dataMin", "dataMax"]}
                  unit=" d"
                  tickFormatter={(value: number) => value.toFixed(1)}
                />
                <YAxis domain={[0, 1]} width={42} />
                <Tooltip labelFormatter={(value) => `${Number(value).toFixed(2)} days`} />
                <Legend />
                {keys.map((key, index) => (
                  <Line
                    key={key}
                    dataKey={key}
                    name={key.replace("_normalized_power", "")}
                    stroke={COLOURS[index % COLOURS.length] ?? CHANNEL.hh.color}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
                <Line
                  dataKey="sampling_window"
                  name="Sampling window"
                  stroke="#adbcc9"
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="x-muted x-small">
            {tr(
              "Normalized fit power is dimensionless. The dashed line describes the acquisition schedule. Candidate periods are tentative.",
            )}
          </p>
        </figure>
      )}
      <h4>{tr("Spatial image spectrum")}</h4>
      {!assets.has("spatial_spectrum.png") && (
        <p className="x-muted">{tr("This job did not publish a 2D spatial-frequency figure.")}</p>
      )}
      <h4>{tr("Historical Gaussian-process fit")}</h4>
      {!supportedGP && (
        <p className="x-muted">
          {capabilities.stochastic?.reason ?? "No supported historical fit was returned."}
        </p>
      )}
      {supportedGP && (
        <details className="x-inset">
          <summary>{tr("Fitted values and conditional bands")}</summary>
          <p className="x-muted x-small">
            {tr(
              "Conditional latent bands use the fitted model at observed dates. Coverage is uncalibrated and sensor error is unestimated.",
            )}
          </p>
          <MeasurementTable
            rows={series.gp_historical_series ?? []}
            columns={{
              date: "UTC date",
              polarization: "Channel",
              supported_cells: "Cells",
              status: "Fit status",
              observed_mean_db: "Measured mean (dB)",
              latent_median_db: "Median fit (dB)",
              conditional_95_lower_db: "95% lower (dB)",
              conditional_95_upper_db: "95% upper (dB)",
            }}
          />
        </details>
      )}
      {products.previews.map((preview) => {
        const asset = assets.get(preview.name);
        return (
          asset?.mediaType === "image/png" && (
            <figure key={preview.name} className="x-figure x-radar__preview">
              <a href={absoluteApiPath(asset.url)} target="_blank" rel="noreferrer">
                <img src={absoluteApiPath(asset.url)} alt={preview.title} loading="lazy" />
              </a>
              <figcaption>
                {preview.name === "spectral.png"
                  ? "Mapped candidate temporal periods"
                  : preview.title}{" "}
                <Prov kind="real" source={SOURCE.liveQuality} />
                {preview.legend &&
                  Object.values(preview.legend)
                    .filter((value) => typeof value === "string")
                    .map((value) => <span key={value}> · {value}</span>)}
              </figcaption>
            </figure>
          )
        );
      })}
      <details className="x-inset">
        <summary>{tr("Regional analysis limitations")}</summary>
        <ul>
          {analysis.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
      <PublishedFiles products={products} />
    </>
  );
};

const MeasurementTable = ({ rows, columns }: { rows: Row[]; columns: Record<string, string> }) => (
  <div className="x-radar__table" role="region" aria-label={tr("Measurement values")}>
    <table>
      <thead>
        <tr>
          {Object.entries(columns).map(([key, label]) => (
            <th key={key} scope="col">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${String(row.date)}-${String(row.polarization)}-${index}`}>
            {Object.keys(columns).map((key) => {
              const value = row[key];
              return (
                <td key={key}>
                  {typeof value === "number" ? Number(value.toFixed(3)) : (value ?? "—")}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const RegionalAnalysisPanel = ({ explorationId }: { explorationId: string }) => {
  const run = useRegionalRun(explorationId);
  const status = run.view?.status;
  const active = status !== undefined && !isFinal(status);
  const products = run.view?.result?.products;
  const failed =
    run.error ??
    (status === "failed" || (status === "partial" && products == null) || status === "cancelled"
      ? (run.view?.error?.detail ?? "Regional analysis did not return measurements.")
      : undefined);

  return (
    <section className="x-sheet__section x-radar__regional" aria-label={tr("Regional analysis")}>
      <h3 className="x-sheet__kicker x-kicker--split">
        <span>{tr("Regional analysis")}</span>
        <ProvenanceChip kind="experimental" />
      </h3>
      <p className="x-muted">
        {tr(
          "Read a separate radar history for regional averages, candidate periods and historical fits. Archive reads can take several minutes.",
        )}
      </p>
      {!failed && (status === undefined || active) && (
        <p role="status" className="x-muted">
          {status === "queued"
            ? "Queued for analysis…"
            : status === "running"
              ? "Reading and analysing the regional sample…"
              : "Submitting analysis…"}
        </p>
      )}
      {failed && <p role="alert">{failed}</p>}
      {status === "partial" && products != null && (
        <p role="status" className="x-muted">
          {tr("Partial regional result.")}
        </p>
      )}
      {status === "noData" && (
        <p role="status" className="x-muted">
          {tr("The regional sample had insufficient measured support.")}
        </p>
      )}
      {failed && !run.starting && (
        <button
          type="button"
          className="x-radar__action"
          onClick={() => retryRegionalRun(explorationId)}
        >
          {tr("Retry regional analysis")}
        </button>
      )}
      {products != null && <RegionalCharts products={products} />}
    </section>
  );
};
