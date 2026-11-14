import { describe, expect, it } from "vitest";

import { SATELLITE_PARTS } from "@/features/satellite/satelliteParts";

// Hotspot copy must match SPECS-content-pages-v8 §1 word for word.
describe("SATELLITE_PARTS", () => {
  it("has the six parts of the spec, in order", () => {
    expect(SATELLITE_PARTS.map((p) => p.title)).toEqual([
      "12 m reflector",
      "9 m boom",
      "L-band radar · 24 cm",
      "S-band radar · 9.4 cm",
      "Spacecraft bus",
      "Solar array",
    ]);
  });

  it("keeps the spec's bodies verbatim", () => {
    const body = (id: string) => SATELLITE_PARTS.find((p) => p.id === id)?.body;
    expect(body("reflector")).toBe(
      "Gold-plated wire mesh stretched on a ring truss. It focuses the radar into a swath more than 240 km wide.",
    );
    expect(body("bus")).toBe(
      "Provided by ISRO, carrying NASA's 3.5 Gbps Ka-band link that sends the data down.",
    );
    expect(body("solar")).toBe("Keeps both radars and the recorder powered around the orbit.");
  });
});
