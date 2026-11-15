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
const RADAR_EVALUATED = ["bug-fire", "rowe-creek", "skollersta"];

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
    // Chocó's marker predates the gateway case, whose coherence window is centred elsewhere.
    for (const item of CASES.filter(({ id }) => id !== "choco")) {
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

  it("show only what a radar_evaluated case returns: cells, passes and its own limit", () => {
    for (const id of RADAR_EVALUATED) {
      const item = CASES.find((entry) => entry.id === id);
      const detail = DETAILS[id];
      const served = listed(id);
      expect(detail?.state, id).toBe("radar_evaluated");
      expect(item?.verdict, id).toBe("measured");
      expect(item?.quality.find(({ k }) => k === "Passes")?.v, id).toBe(
        `${served.baselineDates.length} + ${served.assessmentDates.length}`,
      );
      expect(detail?.limitations, id).toContain(item?.plainLimit);
      expect(`${item?.verdictLine} ${item?.techLimit}`, id).toContain(
        (detail?.radarSupportCells ?? 0).toLocaleString("en-US"),
      );
    }
  });
});
