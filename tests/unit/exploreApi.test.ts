import { describe, expect, it } from "vitest";

import type { LensId } from "@/features/cases/cases";
import { bodyOf, type ExplorationRequest } from "@/features/explore/exploreApi";
import type { AreaGeometry } from "@/features/geo/geo.types";

const POINT: AreaGeometry = { type: "Point", coordinates: [-75.13, 8.66] };

const bodyFor = (lens: LensId) => bodyOf({ lens, geometry: POINT, source: "L" });

describe("bodyOf", () => {
  it("asks for the OPERA optical evidence on the flood lens", () => {
    expect(bodyFor("flood_wetland")).toEqual({
      lens: "flood_wetland",
      geometry: POINT,
      source: "L",
      opticalEvidence: true,
    });
  });

  it("leaves every other lens's request as it was", () => {
    for (const lens of ["vegetation_disturbance", "wildfire", "agriculture"] as const)
      expect(bodyFor(lens)).not.toHaveProperty("opticalEvidence");
    const insar: ExplorationRequest = { lens: "insar", geometry: POINT, source: "L", pairId: "x" };
    expect(bodyOf(insar)).toBe(insar);
  });
});
