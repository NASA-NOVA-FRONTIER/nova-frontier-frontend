// Panels of nova-frontier-model docs/images/global_surface_atlas.png (cropped by scripts/crop-atlas.py).
// Names and date counts are the figure's captions; HOLDOUT marks the figure's two geographic holdouts.
// The landscape words after the date count are the design's (Landing v8), not a model output.
export type AtlasTile = {
  id: string;
  name: string;
  meta: string;
  img: string;
};

export const ATLAS_TILES: readonly AtlasTile[] = [
  { id: "forest-river", name: "Forest River, USA", meta: "10 DATES · FIELDS" },
  { id: "deliblato", name: "Deliblato, Serbia", meta: "8 DATES · SANDS & FARMS" },
  { id: "chenab", name: "Chenab River, Pakistan", meta: "8 DATES · RIVER PLAIN" },
  { id: "niscemi", name: "Niscemi, Italy", meta: "8 DATES · HILLS" },
  { id: "okavango", name: "Okavango, Botswana", meta: "8 DATES · DELTA" },
  { id: "amazon", name: "Amazon floodplain, Brazil", meta: "8 DATES · HOLDOUT" },
  { id: "murray", name: "Murray Basin, Australia", meta: "16 DATES · HOLDOUT" },
].map((tile) => ({ ...tile, img: `/atlas/${tile.id}.png` }));

// Chenab opens first: it is the river behind the landing's story.
export const ATLAS_DEFAULT_ID = "chenab";
