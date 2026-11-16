import { tr } from "@/i18n/translate";
// PLAN-content-pages-v8 §0: the explorer reads L-band only, so it says so instead of offering an
// S button that does nothing (docs/design/README.md, decision 4 as updated on 14 Nov). Every
// request still sends `source: "L"`.
const L_BAND = "L-band, 24 cm.";

export const SourceSwitch = () => (
  <p className="x-source" data-testid="source-switch">
    <span
      className="x-source__band"
      title={tr("L-band (NASA), read on demand")}
      data-testid="source-L"
    >
      {L_BAND}
    </span>
  </p>
);
