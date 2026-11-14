import { describe, expect, it } from "vitest";

import {
  cameraPose,
  hotspotVisible,
  INITIAL_ORBIT,
  orbitByDrag,
  orbitByKey,
  pixelRatioFor,
  satellitePose,
  smoothstep,
  tipPosition,
  trackProgress,
} from "@/features/satellite/satelliteMotion";

const pose = (over: Partial<Parameters<typeof satellitePose>[0]> = {}) =>
  satellitePose({ deploy: 1, beam: 0, scrollDriven: false, progress: 0, reduced: false, ...over });

describe("smoothstep", () => {
  it("is 0 before, 1 after and 0.5 at the middle", () => {
    expect(smoothstep(0.2, 0.4, 0)).toBe(0);
    expect(smoothstep(0.2, 0.4, 1)).toBe(1);
    expect(smoothstep(0.2, 0.4, 0.3)).toBeCloseTo(0.5);
  });
});

describe("pixelRatioFor", () => {
  it("caps the device pixel ratio at 2", () => {
    expect(pixelRatioFor(3)).toBe(2);
    expect(pixelRatioFor(1.5)).toBe(1.5);
    expect(pixelRatioFor(undefined)).toBe(1);
  });
});

describe("trackProgress", () => {
  it("runs 0 → 1 while a 340vh track scrolls through a 900 px viewport", () => {
    const height = 3060;
    expect(trackProgress({ top: 100, height }, 900)).toBe(0);
    expect(trackProgress({ top: -1080, height }, 900)).toBeCloseTo(0.5);
    expect(trackProgress({ top: -5000, height }, 900)).toBe(1);
  });

  it("is 0 when the track is not taller than the viewport", () => {
    expect(trackProgress({ top: 0, height: 500 }, 900)).toBe(0);
  });
});

describe("satellitePose", () => {
  it("is stowed at deploy 0: boom folded, mesh furled, reflector at the bus", () => {
    const p = pose({ deploy: 0 });
    expect(p.boomAngles[0]).toBeCloseTo(0.6435);
    expect(p.boomAngles[1]).toBeCloseTo(3.08);
    expect(p.boomAngles[2]).toBeCloseTo(-3.08);
    expect(p.dishScale).toBeCloseTo(0.08);
    expect(p.reflectorT).toBe(0);
  });

  it("is fully open at deploy 1", () => {
    const p = pose({ deploy: 1 });
    expect(p.boomAngles.every((a) => a === 0 || Object.is(a, -0))).toBe(true);
    expect(p.dishScale).toBe(1);
    expect(p.reflectorT).toBe(1);
  });

  it("maps scroll progress to deploy, beam and zoom like the reference", () => {
    expect(pose({ scrollDriven: true, progress: 0 })).toMatchObject({ deploy: 0, beam: 0 });
    expect(pose({ scrollDriven: true, progress: 0 }).zoom).toBeCloseTo(0.62);
    expect(pose({ scrollDriven: true, progress: 0.25 }).deploy).toBeCloseTo(0.5);
    expect(pose({ scrollDriven: true, progress: 0.9 })).toMatchObject({
      deploy: 1,
      beam: 1,
      zoom: 1,
    });
  });

  it("shows the satellite deployed and still under reduced motion", () => {
    expect(pose({ deploy: 0, reduced: true }).deploy).toBe(1);
    const scrolled = pose({ scrollDriven: true, progress: 0.1, beam: 0.7, reduced: true });
    expect(scrolled).toMatchObject({ deploy: 1, beam: 0.7, zoom: 1, dishScale: 1 });
  });
});

describe("orbit", () => {
  it("clamps the pitch between −0.5 and 1.1", () => {
    expect(orbitByDrag(INITIAL_ORBIT, 0, 1000).pitch).toBe(1.1);
    expect(orbitByDrag(INITIAL_ORBIT, 0, -1000).pitch).toBe(-0.5);
  });

  it("turns with the arrow keys and ignores other keys", () => {
    expect(orbitByKey(INITIAL_ORBIT, "ArrowLeft")?.yaw).toBeCloseTo(-0.3);
    expect(orbitByKey(INITIAL_ORBIT, "ArrowUp")?.pitch).toBeCloseTo(0.32);
    expect(orbitByKey(INITIAL_ORBIT, "Enter")).toBeUndefined();
  });

  it("backs the camera away when the beam is on", () => {
    const off = cameraPose({ yaw: 0, pitch: 0 }, 1, 0);
    const on = cameraPose({ yaw: 0, pitch: 0 }, 1, 1);
    expect(off.position[2]).toBeCloseTo(44);
    expect(on.position[2]).toBeCloseTo(44 * 1.35);
  });
});

describe("hotspots", () => {
  it("hides points behind the camera or at the edge", () => {
    expect(hotspotVisible(true, { x: 100, y: 100, z: 0.5 }, 800, 600)).toBe(true);
    expect(hotspotVisible(false, { x: 100, y: 100, z: 0.5 }, 800, 600)).toBe(false);
    expect(hotspotVisible(true, { x: 100, y: 100, z: 1.2 }, 800, 600)).toBe(false);
    expect(hotspotVisible(true, { x: 4, y: 100, z: 0.5 }, 800, 600)).toBe(false);
  });

  it("flips the tooltip left near the right edge", () => {
    expect(tipPosition(100, 200, 800, 600).left).toBe(118);
    expect(tipPosition(700, 200, 800, 600).left).toBe(432);
  });
});
