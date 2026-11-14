import { describe, expect, it } from "vitest";

import { ATLAS_DEFAULT_ID, ATLAS_TILES } from "@/pages/landing/atlasTiles";

// Every file under public/atlas, as Vite sees it ("/public/atlas/x.png").
const SHIPPED = new Set(Object.keys(import.meta.glob("/public/atlas/*.png")));

describe("surface atlas tiles", () => {
  it("lists the seven panels of the nova-frontier-model figure, each with its crop", () => {
    expect(ATLAS_TILES).toHaveLength(7);
    expect(new Set(ATLAS_TILES.map((tile) => tile.id)).size).toBe(7);
    for (const tile of ATLAS_TILES) expect(SHIPPED.has(`/public${tile.img}`)).toBe(true);
  });

  it("keeps the figure's date counts and marks only its two geographic holdouts", () => {
    // From the captions of docs/images/global_surface_atlas.png ("N measured dates · ...").
    const dates = Object.fromEntries(
      ATLAS_TILES.map((tile) => [tile.id, Number(tile.meta.split(" ")[0])]),
    );
    expect(dates).toEqual({
      "forest-river": 10,
      deliblato: 8,
      chenab: 8,
      niscemi: 8,
      okavango: 8,
      amazon: 8,
      murray: 16,
    });
    const holdouts = ATLAS_TILES.filter((tile) => tile.meta.endsWith("HOLDOUT")).map((t) => t.id);
    expect(holdouts).toEqual(["amazon", "murray"]);
  });

  it("opens on a tile that exists", () => {
    expect(ATLAS_TILES.some((tile) => tile.id === ATLAS_DEFAULT_ID)).toBe(true);
  });
});
