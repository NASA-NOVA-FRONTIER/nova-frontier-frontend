import { describe, expect, it } from "vitest";

import { greatCircleKm } from "@/features/geo/measure";
import { clampCentre, moveSquare, nudgeSquare } from "@/features/geo/squareMove";

describe("moveSquare", () => {
  it("keeps the offset between where the square was grabbed and its centre", () => {
    // Grabbed 0.02° east of the centre, dragged 0.1° east and 0.05° north.
    const centre = moveSquare([-74.75, 2.89], [-74.73, 2.89], [-74.63, 2.94]);
    expect(centre[0]).toBeCloseTo(-74.65, 9);
    expect(centre[1]).toBeCloseTo(2.94, 9);
  });

  it("stays continuous when the drag crosses the antimeridian", () => {
    // From 179.98° E, dragged 0.04° east, lands at −179.98° (not 359.98° or a full turn back).
    const centre = moveSquare([179.98, -16.5], [179.98, -16.5], [-179.98, -16.5]);
    expect(centre[0]).toBeCloseTo(-179.98, 9);
    expect(centre[1]).toBeCloseTo(-16.5, 9);
  });

  it("stops before the square would fold over a pole", () => {
    const [, lat] = moveSquare([0, 89.9], [0, 89.9], [0, 95]);
    expect(lat).toBeLessThan(90);
    expect(lat).toBeCloseTo(90 - 5.12 / 111.32, 9);
  });
});

describe("clampCentre", () => {
  it("wraps a longitude past 180° back into range", () => {
    expect(clampCentre([190, 10])).toEqual([-170, 10]);
  });

  it("leaves a normal centre untouched", () => {
    expect(clampCentre([-74.75, 2.89])).toEqual([-74.75, 2.89]);
  });
});

describe("nudgeSquare", () => {
  it("moves by kilometres, not degrees, at any latitude", () => {
    for (const lat of [0, 45, 70]) {
      const start: [number, number] = [10, lat];
      expect(greatCircleKm(start, nudgeSquare(start, 1, 0))).toBeCloseTo(1, 2);
      expect(greatCircleKm(start, nudgeSquare(start, 0, -5))).toBeCloseTo(5, 1);
    }
  });

  it("wraps across the antimeridian", () => {
    const [lon] = nudgeSquare([179.999, 0], 1, 0);
    expect(lon).toBeLessThan(-179.99);
  });
});
