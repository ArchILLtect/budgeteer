export type SavingsReviewEntry = {
  id: string;
  date: string;
  month: string;
  name: string;
  amount: number;

  createdAt?: string;
  importSessionId?: string;
  originalTxId?: string;

  // Allow additional fields from ingestion / UI without widening to `unknown[]`.
  [key: string]: unknown;
};
