import real from "../fixtures/exploration-qadirabad.json";
import { describe, expect, it } from "vitest";

import { explorationSchema, isFinal, lensEvaluationOf } from "@/features/explore/exploreSchemas";

const REAL = real as Record<string, unknown>;

describe("explorationSchema", () => {
  it("accepts a real answer of the backend and keeps its science blocks", () => {
    const view = explorationSchema.parse(REAL);

    expect(view.status).toBe("succeeded");
    expect(view.result?.lens?.point?.status).toBe("within_observed_baseline");
    expect(view.result?.lens?.point?.target_minus_baseline_db["HH"]).toBeCloseTo(-1.159, 2);
    expect(view.result?.aoiSummary?.cells_departing_from_baseline).toBe(344013);
    expect(view.result?.layers).toHaveLength(6);
    expect(view.result?.isDemo).toBe(false);
  });

  it("accepts a queued job that has no result, ETA breakdown or error yet", () => {
    const queued = {
      ...REAL,
      status: "queued",
      result: null,
      error: null,
      etaRemainingSeconds: 60,
      stages: [],
    };
    expect(explorationSchema.parse(queued).result).toBeNull();
  });

  it.each([
    ["an unknown status", { status: "teleported" }],
    ["a layer without four bounds", { result: { ...(REAL["result"] as object), layers: [{}] } }],
    ["a missing id", { id: undefined }],
    ["a cache value we don't know", { cache: "warm" }],
  ])("rejects %s", (_, change) => {
    expect(explorationSchema.safeParse({ ...REAL, ...change }).success).toBe(false);
  });
});

describe("isFinal", () => {
  it.each([
    ["queued", false],
    ["running", false],
    ["succeeded", true],
    ["partial", true],
    ["noData", true],
    ["failed", true],
    ["cancelled", true],
  ] as const)("says %s is final: %s", (status, expected) => {
    expect(isFinal(status)).toBe(expected);
  });
});

describe("lensEvaluationOf", () => {
  const evaluationOf = (view: unknown) => {
    const result = explorationSchema.parse(view).result;
    return result === null ? undefined : lensEvaluationOf(result);
  };

  it("reads the real evaluation in camelCase", () => {
    expect(evaluationOf(REAL)).toEqual({
      targetDate: "2026-11-11",
      lastBaselineDate: "2026-10-18",
      baselinePasses: 4,
      pixelSpacingM: 10,
      pixelDualDarkening: "absent_on_sampled_support",
      dualDarkening: {
        state: "supports",
        fraction: expect.closeTo(0.1987, 4),
        signatureCells: 208344,
        supportedCells: 1048576,
      },
      coPolBrightening: {
        state: "supports",
        fraction: expect.closeTo(0.1229, 4),
        signatureCells: 128837,
        supportedCells: 1048576,
      },
      dualDarkeningMaxChangeDb: { co: -3, cross: -1.5 },
      surroundings: {
        status: "evaluated",
        differentialState: "absent_on_sampled_support",
        focalCells: 115,
        minimumCells: 5,
        surroundingCells: 2376,
        matchedControlCells: 115,
        focalRadiusM: 60,
        annulusM: [120, 300],
      },
      water: {
        status: "insufficient_data",
        reason: "optical_evidence_unavailable",
        pre: undefined,
        post: undefined,
        groups: undefined,
        matchedPairs: undefined,
        coPolContrast: undefined,
        pointState: undefined,
        pointGroupCode: undefined,
      },
      confounders: [
        "existing_water",
        "rain_or_soil_moisture",
        "freeze_thaw",
        "wind",
        "incidence_and_track",
        "speckle_and_noise",
        "layover_or_shadow",
      ].map((id) => ({ id, status: "unavailable" })),
    });
  });

  it("drops a block it can't read and keeps the rest of the answer", () => {
    const result = REAL["result"] as Record<string, unknown>;
    const lens = result["lens"] as Record<string, unknown>;
    const evaluation = lens["evaluation"] as Record<string, unknown>;
    const broken = {
      ...REAL,
      result: {
        ...result,
        lens: {
          ...lens,
          evaluation: {
            ...evaluation,
            grid_signatures: { dual_darkening: { state: 3 } },
            surrounding_comparison: "not an object",
          },
        },
      },
    };
    const parsed = evaluationOf(broken);
    expect(parsed?.dualDarkening).toBeUndefined();
    expect(parsed?.coPolBrightening).toBeUndefined();
    expect(parsed?.surroundings).toBeUndefined();
    expect(parsed?.pixelDualDarkening).toBe("absent_on_sampled_support");
  });

  it("has no evaluation when the lens has none", () => {
    const result = REAL["result"] as Record<string, unknown>;
    const lens = { ...(result["lens"] as Record<string, unknown>), evaluation: undefined };
    expect(evaluationOf({ ...REAL, result: { ...result, lens } })).toBeUndefined();
  });
});

describe("explorationSchema with science products", () => {
  const RESULT = REAL["result"] as Record<string, unknown>;
  const withProducts = (products: unknown) => ({ ...REAL, result: { ...RESULT, products } });

  const validProducts = {
    visualizations: [
      {
        id: "dual-pol-composite",
        recipe: "hh_hv_composite",
        title: "Dual-polarization composite",
        dates: ["2026-10-18", "2026-11-11"],
        interpretation: "Brighter cells returned more energy to the radar.",
        components: [
          { band: "red", label: "HH", polarizations: ["HH"], displayDb: [-25, 0] },
          { band: "green", label: "HV", polarizations: ["HV"], displayDb: [-30, -5] },
        ],
        colormap: "rgb",
        supportedCells: 1048576,
        totalCells: 1048576,
        grid: {
          crs: "EPSG:4326",
          bounds: [73.6, 32.3, 73.8, 32.5],
          shape: [1024, 1024],
          posting_m: [10, 10],
        },
        bounds: [73.6, 32.3, 73.8, 32.5],
        crs: "EPSG:4326",
        png: "/api/v1/explorations/exp_0123456789abcdef/assets/composite.png",
        cog: null,
      },
    ],
    assets: [
      {
        name: "composite.png",
        url: "/api/v1/explorations/exp_0123456789abcdef/assets/composite.png",
        mediaType: "image/png",
        bytes: 482113,
        sha256: "a".repeat(64),
      },
    ],
    previews: [
      {
        name: "composite.png",
        title: "Dual-polarization composite",
        interpretation: "Brighter cells returned more energy to the radar.",
        legend: null,
      },
    ],
    analysis: null,
  };

  it("keeps valid products as they are", () => {
    const view = explorationSchema.parse(withProducts(validProducts));

    expect(view.result?.products?.visualizations[0]?.supportedCells).toBe(1048576);
    expect(view.result?.products?.assets[0]?.url).toBe(validProducts.assets[0]?.url);
    expect(view.result?.products?.previews).toHaveLength(1);
  });

  it("accepts an asset URL in a shape the frontend didn't expect", () => {
    const products = {
      ...validProducts,
      assets: [{ ...validProducts.assets[0], url: "https://cdn.example.org/composite.png" }],
    };

    expect(explorationSchema.parse(withProducts(products)).result?.products?.assets[0]?.url).toBe(
      "https://cdn.example.org/composite.png",
    );
  });

  it("drops only the products when they have a missing field, keeping the live answer", () => {
    const { previews: _missing, ...products } = {
      ...validProducts,
      assets: [{ ...validProducts.assets[0], url: 42 }],
    };

    const parsed = explorationSchema.safeParse(withProducts(products));

    expect(parsed.success).toBe(true);
    const result = parsed.data?.result;
    expect(result?.products).toBeUndefined();
    expect(result?.lens?.point?.status).toBe("within_observed_baseline");
    expect(result?.observations).toEqual(explorationSchema.parse(REAL).result?.observations);
    expect(result?.layers).toHaveLength(6);
  });

  it("keeps the products when only the analysis block is malformed", () => {
    const view = explorationSchema.parse(
      withProducts({ ...validProducts, analysis: { point: "x" } }),
    );

    expect(view.result?.products?.analysis).toBeUndefined();
    expect(view.result?.products?.visualizations).toHaveLength(1);
  });
});
