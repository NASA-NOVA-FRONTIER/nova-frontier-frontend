// SPECS-content-pages-v8 §3: the stage text follows the track's scroll progress (0–1).
export const SAT_STEP_EDGES = [0.12, 0.55] as const;

export const satStepIndex = (progress: number): 0 | 1 | 2 => {
  if (progress < SAT_STEP_EDGES[0]) return 0;
  if (progress < SAT_STEP_EDGES[1]) return 1;
  return 2;
};
