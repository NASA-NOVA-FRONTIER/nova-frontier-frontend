/// <reference types="node" />
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CASES } from "@/features/cases/cases";
import { sequenceOf, sequenceReadout } from "@/features/timeline/sequence";
import { layoutTimeline } from "@/features/timeline/timelineLayout";

const PUBLIC = join(process.cwd(), "public");

const timelineOf = (id: string) => {
  const data = CASES.find((item) => item.id === id)?.timeline;
  if (data === undefined) throw new Error(`${id} has a timeline`);
  return data;
};

describe("case pass images", () => {
  // A drape pointing at a missing file shows nothing on the globe and fails silently.
  it("every image a case timeline references exists under public/", () => {
    const paths = CASES.flatMap((item) => item.timeline?.passes ?? []).flatMap((pass) =>
      Object.values(pass.images ?? {}),
    );
    expect(paths.length).toBeGreaterThan(0);
    const missing = paths.filter((path) => !existsSync(join(PUBLIC, path)));
    expect(missing).toEqual([]);
  });

  it("Niscemi has HH and HV on all eight passes, so its sequence can play", () => {
    const niscemi = timelineOf("niscemi-aftermath");
    expect(niscemi.passes).toHaveLength(8);
    expect(niscemi.passes.every((pass) => pass.images?.HH !== undefined)).toBe(true);
    expect(niscemi.passes.every((pass) => pass.images?.HV !== undefined)).toBe(true);
    const layout = layoutTimeline(niscemi);
    const sequence = sequenceOf(niscemi, layout);
    expect(sequence.canPlay).toBe(true);
    expect(sequenceReadout(niscemi, layout, sequence, 7).line).toBe("Pass 8 of 8 · 22 Oct 2026");
    expect(sequenceReadout(niscemi, layout, sequence, 0).line).toBe("Pass 1 of 8 · 24 Jun 2026");
  });

  it("Bug Fire's five passes can play too", () => {
    const bugFire = timelineOf("bug-fire");
    expect(sequenceOf(bugFire, layoutTimeline(bugFire)).canPlay).toBe(true);
  });
});
