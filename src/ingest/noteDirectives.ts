import type { BudgeteerDirective } from "../types";

type DeriveNoteResult = {
  bankNote?: string;
  note?: string;
  directives: BudgeteerDirective[];
};

function coerceRowString(val: unknown): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  return trimmed ? trimmed : undefined;
}

export function extractBankNoteFromOriginal(original?: Record<string, unknown>): string | undefined {
  if (!original) return undefined;

  const getCandidate = (key: string) => {
    // Prefer exact match when possible.
    if (Object.prototype.hasOwnProperty.call(original, key)) return (original as Record<string, unknown>)[key];

    // Fallback: match keys case/whitespace-insensitively, and strip BOM.
    const wanted = key.replace(/^\uFEFF/, "").trim().toLowerCase();
    for (const k of Object.keys(original)) {
      const normalized = k.replace(/^\uFEFF/, "").trim().toLowerCase();
      if (normalized === wanted) return (original as Record<string, unknown>)[k];
    }
    return undefined;
  };

  // Common bank export headers; keep this conservative.
  const candidates = [
    getCandidate("Note"),
    getCandidate("note"),
    getCandidate("Notes"),
    getCandidate("notes"),
    getCandidate("Memo"),
    getCandidate("memo"),
  ];

  for (const c of candidates) {
    const v = coerceRowString(c);
    if (v) return v;
  }

  return undefined;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function parseDirectiveToken(token: string): BudgeteerDirective | null {
  const trimmed = token.trim();
  if (!trimmed.toLowerCase().startsWith("budgeteer:")) return null;

  const afterPrefix = trimmed.slice("budgeteer:".length);
  const eq = afterPrefix.indexOf("=");
  if (eq <= 0) return null;

  const keyRaw = afterPrefix.slice(0, eq).trim().toLowerCase();
  const valueRaw = afterPrefix.slice(eq + 1).trim();
  const value = normalizeWhitespace(valueRaw.replace(/^"|"$/g, ""));
  if (!value) return null;

  switch (keyRaw) {
    case "rename":
      return { kind: "rename", value, source: "bankNote" };
    case "category":
      return { kind: "category", value, source: "bankNote" };
    case "goal":
      return { kind: "goal", value, source: "bankNote" };
    case "apply":
      return { kind: "apply", value, source: "bankNote" };
    default:
      return null;
  }
}

/**
 * Parses explicit `budgeteer:*` tokens out of a note.
 *
 * Rules (MVP):
 * - Only recognizes a strict whitelist of directive keys.
 * - Only strips recognized directive tokens from the human-readable `note`.
 * - Unknown `budgeteer:*` text remains in `note` (for now) so we never destroy user data.
 */
export function deriveNoteAndDirectives(bankNote?: string): DeriveNoteResult {
  const directives: BudgeteerDirective[] = [];
  const original = typeof bankNote === "string" ? bankNote : "";
  const raw = original.trim();
  if (!raw) return { directives };

  // Split on semicolons/newlines since that matches the intended authoring style.
  const parts = raw
    .split(/[;\n]+/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const humanParts: string[] = [];

  for (const part of parts) {
    // If the part includes a directive token, attempt to parse only the directive portion.
    // This supports notes like: "First paycheck; budgeteer:rename=Primary Paycheck".
    const idx = part.toLowerCase().indexOf("budgeteer:");
    if (idx === -1) {
      humanParts.push(part);
      continue;
    }

    const before = part.slice(0, idx).trim();
    const token = part.slice(idx).trim();

    const parsed = parseDirectiveToken(token);
    if (parsed) {
      directives.push(parsed);
      if (before) humanParts.push(before);
      continue;
    }

    // Unknown directive: keep entire part as human note to avoid data loss.
    humanParts.push(part);
  }

  const noteCombined = normalizeWhitespace(humanParts.join("; "));

  return {
    bankNote: raw,
    note: noteCombined ? noteCombined : undefined,
    directives,
  };
}

export function deriveNoteAndDirectivesFromOriginal(original?: Record<string, unknown>): DeriveNoteResult {
  const bankNote = extractBankNoteFromOriginal(original);
  return deriveNoteAndDirectives(bankNote);
}
