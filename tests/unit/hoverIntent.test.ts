import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHoverIntent, HOVER_CLOSE_DELAY_MS } from "@/features/satellite/hoverIntent";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = () => {
  const onChange = vi.fn<(id: string | null, previous: string | null) => void>();
  return { onChange, intent: createHoverIntent<string>(onChange) };
};

describe("createHoverIntent", () => {
  it("opens on enter right away", () => {
    const { onChange, intent } = setup();
    intent.enter("boom");
    expect(onChange).toHaveBeenCalledExactlyOnceWith("boom", null);
  });

  it("closes only after the delay", () => {
    const { onChange, intent } = setup();
    intent.enter("boom");
    intent.leave("boom");
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS - 1);
    expect(onChange).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenLastCalledWith(null, "boom");
  });

  it("re-entering the same hotspot cancels the close without a new change", () => {
    const { onChange, intent } = setup();
    intent.enter("boom");
    intent.leave("boom");
    vi.advanceTimersByTime(100);
    intent.enter("boom");
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS * 2);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("moving to another hotspot switches at once and never closes in between", () => {
    const { onChange, intent } = setup();
    intent.enter("lband");
    intent.leave("lband");
    intent.enter("sband");
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS * 2);
    expect(onChange.mock.calls).toEqual([
      ["lband", null],
      ["sband", "lband"],
    ]);
  });

  it("ignores a late leave from a hotspot that is no longer current", () => {
    const { onChange, intent } = setup();
    intent.enter("lband");
    intent.enter("sband");
    intent.leave("lband");
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS * 2);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("cancel drops a pending close", () => {
    const { onChange, intent } = setup();
    intent.enter("boom");
    intent.leave("boom");
    intent.cancel();
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS * 2);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
