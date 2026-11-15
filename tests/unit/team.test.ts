import { describe, expect, it } from "vitest";

import { TEAM } from "@/content/team";

// Every file under public/team, as Vite sees it ("/public/team/x.png").
const SHIPPED = new Set(Object.keys(import.meta.glob("/public/team/*")));

describe("team", () => {
  it("links every member to a GitHub and a LinkedIn profile", () => {
    for (const member of TEAM) {
      expect(member.github, member.name).toMatch(/^https:\/\/github\.com\/[\w-]+$/);
      expect(member.linkedin, member.name).toMatch(
        /^https:\/\/www\.linkedin\.com\/in\/[\w%-]+\/?$/,
      );
    }
  });

  it("shows each member's GitHub login as their handle", () => {
    for (const member of TEAM) {
      expect(member.handle, member.name).toBe(`@${member.github?.split("/").pop()}`);
    }
  });

  // #29: no card falls back to initials or to "Role to fill".
  it("gives every member a photo that ships with the app and a role", () => {
    for (const member of TEAM) {
      expect(member.photo, member.name).toBeDefined();
      expect(SHIPPED.has(`/public${member.photo}`), member.name).toBe(true);
      expect(member.role, member.name).toBeTruthy();
    }
  });
});
