import { SHEET_EVIDENCE_COPY } from "@/content/copyV8";
import type { Source } from "@/features/cases/cases";

export type EvidenceSourcesProps = {
  sources: readonly Source[];
};

export const EvidenceSources = ({ sources }: EvidenceSourcesProps) => (
  <section className="x-card" aria-label={SHEET_EVIDENCE_COPY.sources} data-testid="sheet-sources">
    <h3 className="x-kicker">{SHEET_EVIDENCE_COPY.sources}</h3>
    {sources.length > 0 ? (
      <ul className="x-sources">
        {sources.map(({ href, label }) => (
          <li key={href}>
            <a href={href} target="_blank" rel="noopener">
              {label}
            </a>
          </li>
        ))}
      </ul>
    ) : (
      <p className="x-muted">{SHEET_EVIDENCE_COPY.sourcesUnavailable}</p>
    )}
  </section>
);

export type EvidenceLimitationsProps = {
  plain: string;
  technical?: string;
  alternatives: readonly string[];
  unavailable: string;
};

export const EvidenceLimitations = ({
  plain,
  technical,
  alternatives,
  unavailable,
}: EvidenceLimitationsProps) => (
  <section className="x-sheet__section" aria-label={SHEET_EVIDENCE_COPY.limitations}>
    <h3 className="x-sheet__kicker">{SHEET_EVIDENCE_COPY.limitations}</h3>
    <div className="x-limits">
      <div className="x-limits__col">
        <p className="x-limits__head">{plain}</p>
        {technical !== undefined && (
          <p className="x-muted" data-testid="tech-limit">
            {technical}
          </p>
        )}
        {alternatives.length > 0 && (
          <>
            <p className="x-muted x-small">{SHEET_EVIDENCE_COPY.alternatives}</p>
            <ul className="x-tags">
              {alternatives.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="x-limits__col">
        <p className="x-muted x-small" data-testid="empties-line">
          {unavailable}
        </p>
      </div>
    </div>
  </section>
);
