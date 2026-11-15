import { InfoTip } from "@/lib/InfoTip";

// E2E-only page (stub builds, /__e2e/infotip): mounts InfoTip in the spots that break popovers
// before any real caller exists. The strings are test fixtures, not UI copy; production builds
// drop this file (scripts/check-no-globe-stub.ts fails if `data-e2e-harness` ever ships).
const LABEL = "What is this?";
const TEXT = "Harness text for the popover. A second sentence makes it wrap onto a few lines.";

export const InfoTipHarness = () => (
  <main data-e2e-harness="infotip" className="min-h-dvh bg-[#04070e] p-4 text-[#ebe9e4]">
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
