import real from "../fixtures/exploration-qadirabad.json";
import { describe, expect, it } from "vitest";

import { findCase, type Case } from "@/features/cases/cases";
import { NISCEMI } from "@/features/cases/niscemi";
import {
  CASE_COLUMNS,
  caseCsv,
  csvCell,
  explorationDataCsv,
  EXPLORATION_COLUMNS,
  exportName,
} from "@/features/downloads/dataCsv";
import { explorationSchema, type ExplorationView } from "@/features/explore/exploreSchemas";

const DAY = "2026-11-16";
const VIEW: ExplorationView = explorationSchema.parse(real);

// A file as a spreadsheet reads it: the byte-order mark, then `#` notes, the header and the rows.
const read = (text: string) => {
  expect(text.startsWith("﻿")).toBe(true);
  const lines = text.slice(1).trimEnd().split("\r\n");
  const notes = lines.filter((line) => line.startsWith("# "));
  const [header, ...rows] = lines.filter((line) => !line.startsWith("# "));
  return { notes, header, rows: rows.map((line) => line.split(",")) };
};

const note = (notes: string[], label: string): string | undefined =>
  notes.find((line) => line.startsWith(`# ${label}: `))?.slice(label.length + 4);

describe("exportName", () => {
  it("names the result and the day it was saved", () => {
    expect(exportName("niscemi-aftermath", DAY, "csv")).toBe(
      "nisar-hazard-watch_niscemi-aftermath_2026-11-16.csv",
    );
    expect(exportName("exploration-exp_761b", DAY, "")).toBe(
      "nisar-hazard-watch_exploration-exp-761b_2026-11-16",
    );
  });
});

describe("csvCell", () => {
  it("quotes what would break a row and keeps numbers short", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell(-11.843533515930176)).toBe("-11.8435");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(false)).toBe("false");
  });
});

describe("caseCsv", () => {
  it("writes the landslide case's own series, one row per pass, nothing demo", () => {
    const { notes, header, rows } = read(caseCsv(NISCEMI, DAY));
    expect(header).toBe(CASE_COLUMNS.join(","));
    expect(rows).toHaveLength(8);
    expect(rows[0]).toEqual([
      "2026-06-24",
      "baseline",
      "-11.84",
      "-16.54",
      "-12.52",
      "-20.09",
      "",
      "",
      "",
      "false",
    ]);
    expect(rows.at(-1)?.slice(0, 2)).toEqual(["2026-10-22", "target"]);
    expect(rows[6]?.slice(6)).toEqual(["7564", "16384", "46.167", "false"]);
    expect(rows.every((cells) => cells.length === CASE_COLUMNS.length)).toBe(true);
    expect(note(notes, "Mode")).toContain("OFFLINE");
    expect(note(notes, "Scientific status")).toBe(
      "diagnostic evidence, not a validated classifier",
    );
    expect(note(notes, "Limit")).toBe(NISCEMI.plainLimit);
    expect(notes.filter((line) => line.startsWith("# Source: "))).toHaveLength(
      NISCEMI.sources.length,
    );
    expect(note(notes, "Demo")).toBeUndefined();
    expect(note(notes, "Saved")).toBe(DAY);
  });

  it("flags a demo timeline and leaves its illustrative values out", () => {
    const qadirabad = findCase("qadirabad") as Case;
    const { notes, rows } = read(caseCsv(qadirabad, DAY));
    const measured = (qadirabad.timeline?.passes ?? []).filter((pass) => pass.kind !== "plan");
    expect(rows).toHaveLength(measured.length);
    expect(rows.every((cells) => cells.at(-1) === "true")).toBe(true);
    expect(rows.every((cells) => cells.slice(2, 9).every((value) => value === ""))).toBe(true);
    expect(note(notes, "Demo")).toContain("demo=true");
    expect(note(notes, "Headline")).toContain(qadirabad.stat);
  });

  it("keeps every note on one line, so no value can start a fake row", () => {
    const text = caseCsv({ ...NISCEMI, plainLimit: "one\nline" }, DAY);
    expect(read(text).notes).toContain("# Limit: one line");
  });
});

describe("explorationDataCsv", () => {
  const measured: ExplorationView = {
    ...VIEW,
    result:
      VIEW.result === null
        ? null
        : {
            ...VIEW.result,
            observations: VIEW.result.observations.map((row, index) =>
              index === 0
                ? {
                    ...row,
                    point_db: { HH: -9.5, HV: null },
                    valid_pixel_count_by_pol: { HH: 16000 },
                  }
                : row,
            ),
          },
  };

  it("writes one row per date with its role and the values at the point", () => {
    const { header, rows } = read(explorationDataCsv(measured, DAY));
    expect(header).toBe(EXPLORATION_COLUMNS.join(","));
    expect(rows.map((cells) => cells.slice(0, 2))).toEqual([
      ["2026-07-14", "baseline"],
      ["2026-08-19", "baseline"],
      ["2026-09-12", "baseline"],
      ["2026-10-18", "baseline"],
      ["2026-11-11", "target"],
    ]);
    // A masked channel stays empty, never zero.
    expect(rows[0]?.slice(4, 8)).toEqual(["-9.5", "", "16000", ""]);
    expect(rows[0]?.at(-1)).toMatch(/^NISAR_L2_PR_GCOV_/);
  });

  it("says how it was computed, its status, every limit and its sources", () => {
    const { notes } = read(explorationDataCsv(measured, DAY));
    expect(note(notes, "NISAR Hazard Watch")).toBe(`live exploration ${VIEW.id}`);
    expect(note(notes, "Mode")).toContain("OFFLINE");
    expect(note(notes, "Provenance")).toContain("REAL");
    expect(note(notes, "Scientific status")).toBe(VIEW.result?.scientificStatus);
    expect(notes.filter((line) => line.startsWith("# Limit: "))).toHaveLength(
      VIEW.result?.limitations.length ?? 0,
    );
    expect(note(notes, "Not reported")).toContain("hectares");
    expect(notes.some((line) => line.startsWith("# Source: "))).toBe(true);
  });
});
