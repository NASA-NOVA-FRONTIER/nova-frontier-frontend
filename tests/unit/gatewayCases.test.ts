import gateway from "../fixtures/gateway-cases.json";
import { describe, expect, it } from "vitest";

import { CASES } from "@/features/cases/cases";

/*
 * Issue #28: the demo cases are copied from the gateway's precomputed cases (relayed by the backend at
 * /api/v1/cases). This checks cases.ts against a recorded answer, so a copy that drifts fails here.
 */

type GatewayCase = {
  id: string;
  point: number[];
  status: string;
  baselineDates: string[];
  assessmentDates: string[];
};

type GatewayDetail = {
  status: string;
  state: string | null;
  radarSupportCells: number | null;
  medianCoherence: number | null;
  limitations: string[];
};

const LIST: GatewayCase[] = gateway.cases;
const DETAILS: Record<string, GatewayDetail | undefined> = gateway.details;
// The model's featured stops with no comparator: the gateway returns layers, passes and a limit.
// Niscemi is left to its own series tests (#24): its copy comes from the model series, not /v2/cases.
const NO_COMPARATOR = ["bug-fire", "para-event-02"];

const listed = (id: string): GatewayCase => {
  const found = LIST.find((item) => item.id === id);
  if (found === undefined) throw new Error(`${id} is not served by the gateway`);
  return found;
};

describe("demo cases against the gateway's precomputed cases", () => {
  it("are all served by the gateway", () => {
    for (const item of CASES) expect(listed(item.id).id).toBe(item.id);
  });

  it("sit on the gateway's point", () => {
    // Chocó included: its marker used to sit about 100 km from its measured window.
    for (const item of CASES) {
      const [lon, lat] = listed(item.id).point;
      expect(item.focus[0], item.id).toBeCloseTo(lon ?? Number.NaN, 3);
      expect(item.focus[1], item.id).toBeCloseTo(lat ?? Number.NaN, 3);
    }
  });

  it("name the gateway's first assessment pass as the target", () => {
    for (const item of CASES.filter(
      ({ target, lens }) => target !== undefined && lens !== "observed_dynamics",
    ))
      expect(item.target, item.id).toBe(listed(item.id).assessmentDates[0]);
  });

  // #24: an observed_dynamics case has no lens report; its series reads every value against the
  // last pass (series.target_date, the change layer and both readouts), so that is its target.
  it("name the last assessment pass as the target of a descriptive (landslide) case", () => {
    for (const item of CASES.filter(({ lens }) => lens === "observed_dynamics"))
      expect(item.target, item.id).toBe(listed(item.id).assessmentDates.at(-1));
  });

  it("keep Chocó's median coherence", () => {
    const choco = CASES.find(({ id }) => id === "choco");
    expect(choco?.stat).toBe(DETAILS["choco"]?.medianCoherence?.toFixed(3));
  });

  it("show only what a case without comparator returns: passes and its own limit", () => {
    for (const id of NO_COMPARATOR) {
      const item = CASES.find((entry) => entry.id === id);
      const detail = DETAILS[id];
      const served = listed(id);
      expect(detail, id).toBeDefined();
      expect(item?.verdict, id).toBe("measured");
      expect(item?.quality.find(({ k }) => k === "Passes")?.v, id).toBe(
        `${served.baselineDates.length} + ${served.assessmentDates.length}`,
      );
      expect(detail?.limitations, id).toContain(item?.plainLimit);
      const cells = detail?.radarSupportCells;
      if (cells !== null && cells !== undefined)
        expect(`${item?.verdictLine} ${item?.techLimit}`, id).toContain(
          cells.toLocaleString("en-US"),
        );
    }
  });

  it("copy every gateway limitation of a case that lists them", () => {
    for (const item of CASES.filter(({ limitations }) => limitations !== undefined))
      expect(item.limitations, item.id).toEqual(DETAILS[item.id]?.limitations);
  });

  // Regression (issue #28): Chocó has no common phase cell, so it must never offer a phase.
  it("never give Chocó a phase it does not have", () => {
    const choco = CASES.find(({ id }) => id === "choco");
    expect(choco?.quality.find(({ k }) => k === "Common phase")?.v).toBe("0 cells");
    expect(choco?.techLimit).not.toMatch(/phase is wrapped/);
    expect(choco?.coherenceOnly).toBe(true);
  });
});
