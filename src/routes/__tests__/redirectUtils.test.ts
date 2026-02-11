import { describe, expect, it } from "vitest";
import { sanitizeRedirectPath } from "../redirectUtils";

describe("sanitizeRedirectPath", () => {
  it("falls back on empty or non-internal paths", () => {
    expect(sanitizeRedirectPath(null, "/planner")).toBe("/planner");
    expect(sanitizeRedirectPath("", "/planner")).toBe("/planner");
    expect(sanitizeRedirectPath("https://example.com", "/planner")).toBe("/planner");
    expect(sanitizeRedirectPath("//example.com", "/planner")).toBe("/planner");
    expect(sanitizeRedirectPath("not-a-path", "/planner")).toBe("/planner");
  });

  it("allows known app routes", () => {
    expect(sanitizeRedirectPath("/planner", "/")).toBe("/planner");
    expect(sanitizeRedirectPath("/accounts?x=1", "/")).toBe("/accounts?x=1");
    expect(sanitizeRedirectPath("/imports#top", "/")).toBe("/imports#top");
  });

  it("blocks unknown routes", () => {
    expect(sanitizeRedirectPath("/totally-unknown", "/planner")).toBe("/planner");
  });

  it("can disallow login to avoid loops", () => {
    expect(sanitizeRedirectPath("/login", "/planner", { disallowLogin: true })).toBe("/planner");
    expect(sanitizeRedirectPath("/login?redirect=%2Fplanner", "/planner", { disallowLogin: true })).toBe("/planner");
  });
});
