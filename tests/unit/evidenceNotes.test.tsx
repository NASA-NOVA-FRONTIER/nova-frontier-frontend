import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EvidenceLimitations, EvidenceSources } from "@/features/case-panel/EvidenceNotes";
import { RadarHistory } from "@/features/sheet/RadarHistory";

describe("shared evidence blocks", () => {
  it("links the supplied sources and explains when no links were supplied", () => {
    expect(
      renderToStaticMarkup(
        <EvidenceSources sources={[{ href: "https://example.org/source", label: "Manifest" }]} />,
      ),
    ).toContain('href="https://example.org/source"');
    expect(renderToStaticMarkup(<EvidenceSources sources={[]} />)).toContain(
      "No source links were supplied for this result.",
    );
  });

  it("keeps plain limits visible and adds the technical note when provided", () => {
    const markup = renderToStaticMarkup(
      <EvidenceLimitations
        plain="Wrapped phase only."
        technical="Phase is cyclic."
        alternatives={[]}
        unavailable="Displacement is unavailable."
      />,
    );
    expect(markup).toContain("Wrapped phase only.");
    expect(markup).toContain("Phase is cyclic.");
    expect(markup).toContain("Displacement is unavailable.");
  });

  it("uses a supplied reason for an unavailable history", () => {
    const markup = renderToStaticMarkup(
      <RadarHistory
        returns={[]}
        date=""
        onDate={() => undefined}
        provenance="offline"
        source="Measured case manifest"
        unavailableReason="The case provides imagery only."
      />,
    );
    expect(markup).toContain("The case provides imagery only.");
  });
});
