import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { analyzeImport } from "../analyzeImport";
import { runIngestion } from "../runIngestion";

function makeDeterministicNow() {
  let t = 0;
  return () => {
    t += 1;
    return t;
  };
}

function installDeterministicCrypto() {
  const original = (globalThis as unknown as { crypto?: Crypto }).crypto;

  let i = 0;
  const randomUUID = () => {
    i += 1;
    return `uuid-${i}`;
  };

  const nextCrypto = {
    ...(original || ({} as Crypto)),
    randomUUID,
  } as Crypto;

  Object.defineProperty(globalThis, "crypto", {
    value: nextCrypto,
    configurable: true,
  });

  return () => {
    Object.defineProperty(globalThis, "crypto", {
      value: original,
      configurable: true,
    });
  };
}

describe("analyzeImport", () => {
  let restoreCrypto: (() => void) | null = null;

  beforeEach(() => {
    restoreCrypto = installDeterministicCrypto();
  });

  afterEach(() => {
    restoreCrypto?.();
    restoreCrypto = null;
  });

  it("returns a serializable ImportPlan (no patch closure)", async () => {
    const now = makeDeterministicNow();

    const csv = [
      "date,description,amount",
      "2026-02-01,Paycheck,100.00",
      "2026-02-02,Groceries,-20.50",
    ].join("\n");

    const plan = await analyzeImport({
      fileText: csv,
      accountNumber: "1234",
      existingTxns: [],
      sessionId: "s1",
      importedAt: "2026-02-14T00:00:00.000Z",
      now,
    });

    expect(plan.session.sessionId).toBe("s1");
    expect(plan.stats.importSessionId).toBe("s1");

    // ImportPlan should be cloneable/serializable (no functions).
    expect(() => structuredClone(plan)).not.toThrow();
    expect((plan as unknown as { patch?: unknown }).patch).toBeUndefined();
  });

  it("runIngestion delegates analysis to analyzeImport and still returns a patch", async () => {
    const now = makeDeterministicNow();

    const csv = [
      "date,description,amount",
      "2026-02-01,Paycheck,100.00",
      "2026-02-02,Groceries,-20.50",
    ].join("\n");

    const plan = await analyzeImport({
      fileText: csv,
      accountNumber: "1234",
      existingTxns: [],
      sessionId: "s1",
      importedAt: "2026-02-14T00:00:00.000Z",
      now,
    });

    const result = await runIngestion({
      fileText: csv,
      accountNumber: "1234",
      existingTxns: [],
      sessionId: "s1",
      importedAt: "2026-02-14T00:00:00.000Z",
      now,
    });

    expect(result.importSessionId).toBe("s1");
    expect(typeof result.patch).toBe("function");

    expect(result.stats.hash).toBe(plan.stats.hash);

    const stripIds = <T extends Record<string, unknown>>(items: T[]) =>
      items.map((item) => {
        const copy: Record<string, unknown> = { ...item };
        delete copy.id;
        return copy;
      });

    expect(stripIds(result.acceptedTxns)).toEqual(stripIds(plan.acceptedPreview));
    expect(stripIds(result.savingsQueue)).toEqual(stripIds(plan.savingsQueue));
  });
});
