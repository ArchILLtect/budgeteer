import { describe, expect, it } from "vitest";

import { deriveNoteAndDirectives } from "../noteDirectives";

describe("noteDirectives", () => {
  it("parses a single rename directive and strips it from note", () => {
    const r = deriveNoteAndDirectives("budgeteer:rename=Primary Paycheck");
    expect(r.directives).toHaveLength(1);
    expect(r.directives[0]).toEqual({
      kind: "rename",
      value: "Primary Paycheck",
      source: "bankNote",
    });
    expect(r.note).toBeUndefined();
  });

  it("keeps human note and parses directive when semicolon-separated", () => {
    const r = deriveNoteAndDirectives(
      "First paycheck from CompanyX; budgeteer:rename=Primary Paycheck",
    );
    expect(r.note).toBe("First paycheck from CompanyX");
    expect(r.directives.map((d) => d.kind)).toEqual(["rename"]);
  });

  it("parses multiple directives", () => {
    const r = deriveNoteAndDirectives(
      "budgeteer:apply=savings; budgeteer:goal=Yearly Savings Goal 2026",
    );
    expect(r.note).toBeUndefined();
    expect(r.directives.map((d) => [d.kind, d.value])).toEqual([
      ["apply", "savings"],
      ["goal", "Yearly Savings Goal 2026"],
    ]);
  });

  it("does not strip unknown budgeteer tokens", () => {
    const r = deriveNoteAndDirectives("budgeteer:unknown=Thing; hello");
    expect(r.directives).toHaveLength(0);
    expect(r.note).toBe("budgeteer:unknown=Thing; hello");
  });
});
