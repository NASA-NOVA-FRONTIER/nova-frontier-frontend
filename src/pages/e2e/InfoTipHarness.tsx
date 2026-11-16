import { useEffect, useState } from "react";

import { INFO_TIP } from "@/content/copyV9";
import { InfoTip } from "@/lib/InfoTip";

// E2E-only page (stub builds, /__e2e/infotip): mounts InfoTip in the spots that break popovers
// before any real caller exists. The label is the real copy; titles and text are test fixtures.
// Production builds drop this file (scripts/check-no-globe-stub.ts fails if `data-e2e-harness` ever ships).
const LABEL = INFO_TIP.label;
const TEXT = "Harness text for the popover. A second sentence makes it wrap onto a few lines.";

// Counts the Esc presses that reach window, like ExplorerPage's "close the innermost thing" listener.
const usePageEscCount = (): number => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCount((n) => n + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return count;
};

export const InfoTipHarness = () => {
  const pageEsc = usePageEscCount();
  return (
    <main data-e2e-harness="infotip" className="min-h-dvh bg-[#04070e] p-4 text-[#ebe9e4]">
      <p data-testid="page-esc">{pageEsc}</p>
      <p className="flex items-center gap-2" data-testid="row-plain">
        <span>Plain</span>
        <InfoTip label={LABEL} title="Plain" text={TEXT} testId="tip-plain" />
      </p>

      <div
        data-testid="panel"
        className="mt-6 h-[140px] w-[240px] overflow-auto rounded-xl border border-white/20 p-3"
      >
        <p className="h-[80px]">Scrolling panel</p>
        <p className="flex items-center gap-2">
          <span>In the panel</span>
          <InfoTip label={LABEL} title="Panel" text={TEXT} testId="tip-panel" />
        </p>
        <p className="h-[200px]" />
      </div>

      <p data-testid="outside" className="mt-6 h-[80px]">
        Outside
      </p>

      <span className="fixed top-[120px] right-2">
        <InfoTip label={LABEL} title="Right edge" text={TEXT} testId="tip-right" />
      </span>
      <span className="fixed bottom-3 left-1/2">
        <InfoTip label={LABEL} title="Bottom edge" text={TEXT} testId="tip-bottom" />
      </span>
    </main>
  );
};
