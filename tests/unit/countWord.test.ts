import { describe, expect, it } from "vitest";

import { countWord, countWordCapitalized } from "@/lib/countWord";

describe("countWord", () => {
  it("spells zero to twelve", () => {
    expect(countWord(0)).toBe("zero");
    expect(countWord(6)).toBe("six");
    expect(countWord(12)).toBe("twelve");
  });

  it("falls back to digits past twelve and for anything that isn't a whole count", () => {
    expect(countWord(13)).toBe("13");
    expect(countWord(-1)).toBe("-1");
    expect(countWord(2.5)).toBe("2.5");
  });

  it("capitalizes a count that opens a sentence", () => {
    expect(countWordCapitalized(6)).toBe("Six");
    expect(countWordCapitalized(20)).toBe("20");
  });
});
