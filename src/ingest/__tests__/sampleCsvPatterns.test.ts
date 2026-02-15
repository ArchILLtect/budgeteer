import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { analyzeImport } from "../analyzeImport";

function readSample(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.resolve(here, "../../../samples", name);
  return readFileSync(filePath, "utf8");
}

describe("CSV ingestion supports /samples patterns", () => {
  it("ingests sample-transactions.csv (date, description, amount, type, category)", async () => {
    const csv = readSample("sample-transactions.csv");

    const plan = await analyzeImport({
      fileText: csv,
      accountNumber: "A1",
      existingTxns: [],
      sessionId: "s1",
      importedAt: "2026-02-14T00:00:00.000Z",
    });

    expect(plan.accepted.length).toBeGreaterThan(0);

    const paycheck = plan.accepted.find((t) => t.description === "Paycheck");
    expect(paycheck).toBeTruthy();
    expect(paycheck?.date).toBe("2025-07-01");
    expect(paycheck?.rawAmount).toBe(2500);
    expect(paycheck?.type).toBe("income");

    const groceries = plan.accepted.find((t) => t.description === "Groceries");
    expect(groceries).toBeTruthy();
    expect(groceries?.rawAmount).toBe(-120.5);
    expect(groceries?.type).toBe("expense");
    expect(groceries?.category).toBe("food");

    const savings = plan.accepted.find((t) => t.description === "Savings Transfer");
    expect(savings).toBeTruthy();
    expect(savings?.type).toBe("savings");
  });

  it("ingests History_07-28-25.csv (Posted Date, Amount with parentheses, Balance)", async () => {
    const csv = readSample("History_07-28-25.csv");

    const plan = await analyzeImport({
      fileText: csv,
      accountNumber: "0457397801",
      existingTxns: [],
      sessionId: "s1",
      importedAt: "2026-02-14T00:00:00.000Z",
    });

    expect(plan.accepted.length).toBeGreaterThan(10);

    // First non-header row in the sample starts at 8/5/2025 with ($6.50)
    const first = plan.accepted[0];
    expect(first.date).toBe("2025-08-05");
    expect(first.rawAmount).toBe(-6.5);
    expect(first.amount).toBe(6.5);

    // Ensure Balance is present in original row so strong-key can include it.
    const orig = first.original as Record<string, unknown> | undefined;
    expect(orig && ("Balance" in orig || "balance" in orig)).toBe(true);

    // Transfer row should classify as savings.
    const transfer = plan.accepted.find((t) => (t.description || "").toLowerCase().includes("tfr to sv"));
    expect(transfer?.type).toBe("savings");
  });
});
