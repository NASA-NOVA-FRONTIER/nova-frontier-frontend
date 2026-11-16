/// <reference types="node" />
import { statSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { creditLine, TRACK_LIST, TRACKS, trackIdForRoute } from "@/features/music/tracks";

const AUDIO_DIR = new URL("../../src/features/music/audio/", import.meta.url);
// Issue #36: about 3 MB per track at most, so the first listen stays light.
const MAX_TRACK_BYTES = 3 * 1024 * 1024;
const CONTENT_PAGES = ["/", "/cases", "/method", "/learn", "/about"];

describe("trackIdForRoute", () => {
  it.each(CONTENT_PAGES)("plays the landing track on %s", (pathname) => {
    // Arrange / Act
    const id = trackIdForRoute({ pathname, search: "" });

    // Assert
    expect(id).toBe("landing");
  });

  it("plays the globe track in the explorer", () => {
    expect(trackIdForRoute({ pathname: "/explore", search: "?case=qadirabad" })).toBe("globe");
  });

  it("treats a legacy /?frame= link as the explorer", () => {
    expect(trackIdForRoute({ pathname: "/", search: "?frame=47-3" })).toBe("globe");
  });

  it("keeps the printable report silent", () => {
    expect(trackIdForRoute({ pathname: "/report", search: "?case=qadirabad" })).toBeNull();
  });

  it("falls back to the landing track on an unknown path", () => {
    expect(trackIdForRoute({ pathname: "/nowhere", search: "" })).toBe("landing");
  });
});

describe("TRACKS", () => {
  it("has one track per id", () => {
    expect(TRACK_LIST.map((track) => track.id).sort()).toEqual(["globe", "landing"]);
    expect(TRACKS.landing.id).toBe("landing");
    expect(TRACKS.globe.id).toBe("globe");
  });

  it.each(TRACK_LIST.map((track) => [track.id, track] as const))(
    "keeps the %s file within the size budget",
    (_id, track) => {
      // Arrange / Act
      const { size } = statSync(new URL(track.file, AUDIO_DIR));

      // Assert
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThanOrEqual(MAX_TRACK_BYTES);
    },
  );

  it.each(TRACK_LIST.map((track) => [track.id, track] as const))(
    "names the author and links the license and the source of %s",
    (_id, track) => {
      expect(track.artist).toBe("Scott Buckley");
      expect(track.licenseName).toBe("CC BY 4.0");
      expect(track.licenseUrl).toBe("https://creativecommons.org/licenses/by/4.0/");
      expect(track.sourceUrl).toMatch(/^https:\/\/www\.scottbuckley\.com\.au\/library\//);
    },
  );

  it("keeps both tracks quiet, the globe quieter than the landing", () => {
    // Arrange
    const { landing, globe } = TRACKS;

    // Assert
    expect(landing.gain).toBeLessThanOrEqual(0.5);
    expect(globe.gain).toBeGreaterThan(0);
    expect(globe.gain).toBeLessThan(landing.gain);
  });
});

describe("creditLine", () => {
  it("follows the format the author asks for", () => {
    expect(creditLine(TRACKS.landing)).toBe(
      "'Starfire' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au",
    );
    expect(creditLine(TRACKS.globe)).toBe(
      "'Solace' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au",
    );
  });
});
