import { describe, expect, it } from "vitest";

import { pointHistory } from "@/features/charts/pointHistory";

describe("pointHistory", () => {
  it("keeps acquisition order and subtracts HH from HV only within the same acquisition", () => {
    const history = pointHistory([
      { date: "2026-10-24", power: { HH: -11, HV: -21 } },
      { date: "2026-09-30", power: { HH: -14, HV: null } },
      { date: "2026-08-25", power: { HV: -23 } },
      { date: "2026-06-26", power: { HHHH: -20, HVHV: -17 } },
    ]);
    expect(history.rows.map(({ date, balance }) => [date, balance])).toEqual([
      ["2026-06-26", 3],
      ["2026-08-25", null],
      ["2026-09-30", null],
      ["2026-10-24", -10],
    ]);
    expect(history.hasBalance).toBe(true);
  });

  it("preserves explicit gaps and does not treat VV and VH as HH and HV", () => {
    const history = pointHistory([
      { date: "2026-06-26", power: { HH: null, HHHH: -20, HV: -17 } },
      { date: "2026-08-25", power: { VV: -12, VH: -20 } },
      { date: "unknown", power: { HH: -9, HV: -18 } },
    ]);
    expect(history.rows.map(({ balance }) => balance)).toEqual([null, null]);
    expect(history.hasBalance).toBe(false);
  });
});
