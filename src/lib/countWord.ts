// Headings spell small counts as words ("Six places"); past twelve, digits read better.
const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

export const countWord = (n: number): string => WORDS[n] ?? String(n);

// For a count that opens a sentence.
export const countWordCapitalized = (n: number): string => {
  const word = countWord(n);
  return word.charAt(0).toUpperCase() + word.slice(1);
};
