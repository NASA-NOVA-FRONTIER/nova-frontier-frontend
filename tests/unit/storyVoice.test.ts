import { describe, expect, it } from "vitest";

import { pickStoryVoice, STORY_SPEECH_RATE } from "@/features/story/storyVoice";

const voice = (name: string, lang: string) => ({ name, lang });

describe("pickStoryVoice", () => {
  it("prefers a Natural voice over Google US English and the default", () => {
    // Arrange
    const voices = [
      voice("Microsoft David - English (United States)", "en-US"),
      voice("Google US English", "en-US"),
      voice("Microsoft Aria Online (Natural) - English (United States)", "en-US"),
    ];

    // Act / Assert
    expect(pickStoryVoice(voices)?.name).toBe(
      "Microsoft Aria Online (Natural) - English (United States)",
    );
  });

  it("picks Google US English when no Natural voice exists", () => {
    const voices = [voice("Samantha", "en-US"), voice("Google US English", "en-US")];

    expect(pickStoryVoice(voices)?.name).toBe("Google US English");
  });

  it("never picks a voice in another language, however natural", () => {
    const voices = [
      voice("Microsoft Dalia Online (Natural) - Spanish (Mexico)", "es-MX"),
      voice("Samantha", "en-US"),
    ];

    expect(pickStoryVoice(voices)?.name).toBe("Samantha");
  });

  it("prefers US English among plain voices", () => {
    const voices = [voice("Daniel", "en-GB"), voice("Alex", "en_US")];

    expect(pickStoryVoice(voices)?.name).toBe("Alex");
  });

  it("returns undefined when there is no English voice (or none loaded yet)", () => {
    expect(pickStoryVoice([])).toBeUndefined();
    expect(pickStoryVoice([voice("Paulina", "es-MX")])).toBeUndefined();
  });
});

describe("STORY_SPEECH_RATE", () => {
  it("reads a little slower than the default rate", () => {
    expect(STORY_SPEECH_RATE).toBeLessThan(1);
    expect(STORY_SPEECH_RATE).toBeGreaterThanOrEqual(0.8);
  });
});
