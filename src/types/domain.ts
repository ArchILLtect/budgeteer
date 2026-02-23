export type BudgetDayKey = string; // YYYY-MM-DD
export type BudgetMonthKey = string; // YYYY-MM

export type ImportSessionId = string;

export type ImportSession = {
  sessionId: ImportSessionId;
  accountNumber: string;
  importedAt: string;
  hash?: string;
  newCount?: number;

  [key: string]: unknown;
};

export type TransactionType = "income" | "expense" | "savings";

export type BudgeteerDirectiveSource = "bankNote" | "ui";

export type BudgeteerDirective =
  | {
      kind: "rename";
      value: string;
      source: BudgeteerDirectiveSource;
    }
  | {
      kind: "category";
      value: string;
      source: BudgeteerDirectiveSource;
    }
  | {
      kind: "goal";
      value: string;
      source: BudgeteerDirectiveSource;
    }
  | {
      kind: "apply";
      value: string;
      source: BudgeteerDirectiveSource;
    };

// Local-first transaction shape used throughout ingestion + store.
// This is intentionally tolerant (allows extra fields) while we harden types.
export type Transaction = {
  id?: string;
  date?: BudgetDayKey;
  description?: string;

  // User-facing label. If omitted, UI should display `description`.
  name?: string | null;

  // In some legacy UI paths this can be a string; ingestion generally uses numbers.
  amount?: number | string;
  rawAmount?: number;

  type?: TransactionType;
  category?: string;

  // Notes + directives
  bankNote?: string | null;
  note?: string | null;
  directives?: BudgeteerDirective[];

  accountNumber?: string;

  // Import lifecycle
  importSessionId?: string;
  staged?: boolean;
  budgetApplied?: boolean;

  // Raw/origin payloads (CSV row, OFX record, etc)
  original?: Record<string, unknown>;
  origin?: string;

  [key: string]: unknown;
};

export type Account = {
  id?: string;
  accountNumber?: string;
  label?: string;
  institution?: string;
  transactions?: Transaction[];

  [key: string]: unknown;
};

export type AccountMapping = {
  label: string;
  institution: string;
};
