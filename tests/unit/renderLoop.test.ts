import { describe, expect, it } from "vitest";

import {
  createFpsMeter,
  createRenderLoop,
  type FrameScheduler,
} from "@/features/satellite/renderLoop";

// A hand-cranked requestAnimationFrame: `flush` runs the frames queued so far.
const fakeScheduler = () => {
  let next = 1;
  const queue = new Map<number, () => void>();
  const scheduler: FrameScheduler = {
    request: (cb) => {
      queue.set(next, cb);
      return next++;
    },
    cancel: (id) => {
      queue.delete(id);
    },
  };
  const flush = (times = 1) => {
    for (let i = 0; i < times; i++) {
      const callbacks = [...queue.values()];
      queue.clear();
      for (const cb of callbacks) cb();
    }
  };
  return { scheduler, flush, pending: () => queue.size };
};

describe("createRenderLoop (motion allowed)", () => {
  it("draws every frame while visible and stops scheduling off screen", () => {
    const fake = fakeScheduler();
    let drawn = 0;
    const loop = createRenderLoop(() => drawn++, { continuous: true, scheduler: fake.scheduler });
    expect(loop.running()).toBe(false);
    loop.setVisible(true);
    fake.flush(5);
    expect(drawn).toBe(5);
    expect(loop.running()).toBe(true);

    loop.setVisible(false);
    expect(loop.running()).toBe(false);
    expect(fake.pending()).toBe(0);
    fake.flush(5);
    expect(drawn).toBe(5);

    loop.setVisible(true);
    fake.flush(2);
    expect(drawn).toBe(7);
    expect(loop.frames()).toBe(7);
  });

  it("never schedules again after stop (unmount)", () => {
    const fake = fakeScheduler();
    const loop = createRenderLoop(() => undefined, { continuous: true, scheduler: fake.scheduler });
    loop.setVisible(true);
    loop.stop();
    loop.invalidate();
    loop.setVisible(true);
    expect(fake.pending()).toBe(0);
  });

  it("reports running changes", () => {
    const fake = fakeScheduler();
    const changes: boolean[] = [];
    const loop = createRenderLoop(() => undefined, {
      continuous: true,
      scheduler: fake.scheduler,
      onRunningChange: (r) => changes.push(r),
    });
    loop.setVisible(true);
    fake.flush(3);
    loop.setVisible(false);
    expect(changes).toEqual([true, false]);
  });
});

describe("createRenderLoop (reduced motion)", () => {
  it("draws once, then only after a change, and nothing while hidden", () => {
    const fake = fakeScheduler();
    let drawn = 0;
    const loop = createRenderLoop(() => drawn++, { continuous: false, scheduler: fake.scheduler });
    loop.setVisible(true);
    fake.flush(10);
    expect(drawn).toBe(1);
    expect(loop.running()).toBe(false);

    loop.invalidate();
    loop.invalidate();
    fake.flush(10);
    expect(drawn).toBe(2);

    loop.setVisible(false);
    loop.invalidate();
    fake.flush(3);
    expect(drawn).toBe(2);
    loop.setVisible(true);
    fake.flush(3);
    expect(drawn).toBe(3);
  });
});

describe("createFpsMeter", () => {
  it("reports the average once after the window", () => {
    const meter = createFpsMeter(0, 2000);
    let reported: number | undefined;
    for (let t = 0; t <= 2100; t += 20) reported ??= meter.tick(t);
    expect(reported).toBeCloseTo(50, 0);
    expect(meter.tick(5000)).toBeUndefined();
  });

  it("ignores slow start-up frames during the warm-up", () => {
    const meter = createFpsMeter(500, 1000);
    let reported: number | undefined;
    for (let t = 0; t < 500; t += 100) reported ??= meter.tick(t);
    for (let t = 500; t <= 1600; t += 16) reported ??= meter.tick(t);
    expect(reported).toBeGreaterThan(60);
  });

  it("restarts the warm-up and window after a pause", () => {
    const meter = createFpsMeter(0, 1000);
    meter.tick(0);
    meter.tick(500);
    meter.reset();
    expect(meter.tick(10_000)).toBeUndefined();
    expect(meter.tick(10_500)).toBeUndefined();
  });
});
