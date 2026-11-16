// The story's narration voice: the browser's default voice often sounds robotic, so pick the most
// natural English voice it offers. Pure, so it is tested without a speech engine.

export type VoiceLike = { name: string; lang: string };

// A touch slower than the default 1 reads the captions more calmly.
export const STORY_SPEECH_RATE = 0.9;

// Edge's neural voices say "Natural", Chrome ships "Google US English", Safari marks its better
// downloads "Premium" or "Enhanced".
const NAME_SCORES: readonly (readonly [RegExp, number])[] = [
  [/natural/i, 40],
  [/google us english/i, 30],
  [/premium/i, 20],
  [/enhanced/i, 15],
];

const isEnglish = (lang: string): boolean => /^en(-|_|$)/i.test(lang);

const isUsEnglish = (lang: string): boolean => /^en[-_]us$/i.test(lang);

const scoreOf = ({ name, lang }: VoiceLike): number => {
  const nameScore = NAME_SCORES.find(([pattern]) => pattern.test(name))?.[1] ?? 0;
  return nameScore + (isUsEnglish(lang) ? 5 : 0);
};

// undefined when the browser lists no English voice (or none yet): the utterance keeps its default.
export const pickStoryVoice = <V extends VoiceLike>(voices: readonly V[]): V | undefined => {
  let best: V | undefined;
  let bestScore = -1;
  for (const voice of voices) {
    if (!isEnglish(voice.lang)) continue;
    const score = scoreOf(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
};
