export type CloudAccount = {
  accountNumber: string;
  label: string | null;
  institution: string | null;
};

export type CloudTransaction = {
  id: string;
  accountNumber: string;

  date: string; // YYYY-MM-DD
  description: string;
  rawAmount: number;

  name: string | null;
  note: string | null;
  category: string | null;

  importSessionId: string | null;
  staged: boolean;
  budgetApplied: boolean;

  // Optional precomputed strong key (if backend stores it).
  strongKey?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export type CloudPullSnapshot = {
  accounts: CloudAccount[];
  transactions: CloudTransaction[];
};

export type CloudSyncApi = {
  pullSnapshot: (opts: { ownerId: string }) => Promise<CloudPullSnapshot>;
};

export const cloudSyncApiStub: CloudSyncApi = {
  async pullSnapshot() {
    throw new Error("CloudSyncApi not implemented in this repo (provided by Taskmaster GraphQL layer). ");
  },
};
