import { MOBILE } from "@/content/copyV8";

type SheetHandleProps = { expanded: boolean; onToggle: () => void };

// The grab bar on top of the phone sheet; a tap trades globe for panel and back.
export const SheetHandle = ({ expanded, onToggle }: SheetHandleProps) => (
  <button
    type="button"
    className="x-sheet-handle"
    aria-expanded={expanded}
    aria-label={expanded ? MOBILE.sheetShrink : MOBILE.sheetExpand}
    onClick={onToggle}
    data-testid="sheet-handle"
  >
    <span className="x-sheet-handle__bar" aria-hidden="true" />
  </button>
);
