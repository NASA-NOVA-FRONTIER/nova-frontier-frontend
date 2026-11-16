import type { ExplorationView } from "@/features/explore/exploreSchemas";

export const EXPLORATION_SOURCE =
  "NISAR Hazard Watch exploration computed by the backend on NISAR L-band scenes. Diagnostic evidence, not a validated classifier; no cause, probability, hectares or displacement is reported.";

export const explorationJson = (view: ExplorationView): string =>
  JSON.stringify({ source: EXPLORATION_SOURCE, exploration: view }, null, 2);
